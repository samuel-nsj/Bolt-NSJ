import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OrderRequest {
  bookingId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { bookingId }: OrderRequest = await req.json();

    if (!bookingId) {
      throw new Error("Booking ID is required");
    }

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .maybeSingle();

    if (bookingError || !booking) {
      throw new Error(`Booking not found: ${bookingId}`);
    }

    if (booking.payment_status !== "paid") {
      throw new Error("Payment not confirmed. Order cannot be sent to StarShipIt.");
    }

    const pickupParts = booking.pickup_address.split(",");
    const deliveryParts = booking.delivery_address.split(",");
    
    const pickupCity = pickupParts[0]?.trim() || "";
    const deliveryCity = deliveryParts[0]?.trim() || "";
    
    const starshipitApiKey = Deno.env.get("STARSHIPIT_API_KEY");
    const starshipitSubscriptionKey = Deno.env.get("STARSHIPIT_SUBSCRIPTION_KEY");

    if (!starshipitApiKey || !starshipitSubscriptionKey) {
      throw new Error("StarShipIt credentials not configured");
    }

    // StarShipIt API Order Structure - exactly as required
    const starshipitPayload = {
      order: {
        order_number: booking.reference_number || `NSJ-${booking.id.substring(0, 8)}`,
        order_date: booking.created_at,
        reference: booking.reference_number || "",
        shipping_method: booking.service_type || "Standard",
        shipping_description: `${booking.package_description || 'General Goods'}`,
        currency: "AUD",

        // Destination (Delivery) - exact StarShipIt field names
        destination: {
          name: booking.delivery_name || booking.customer_name,
          email: booking.delivery_email || booking.customer_email,
          company: booking.delivery_company || "",
          phone: booking.delivery_phone || booking.customer_phone,
          street: booking.delivery_address || "",
          suburb: booking.delivery_suburb || "",
          state: "", // Will be auto-detected by StarShipIt from postcode
          post_code: booking.delivery_postcode || "",
          country: "AU",
          delivery_instructions: ""
        },

        // Items array - required by StarShipIt
        items: [
          {
            description: booking.package_description || "General Goods",
            sku: booking.reference_number || `NSJ-${booking.id.substring(0, 8)}`,
            quantity: booking.quantity || 1,
            weight: booking.package_weight || 1,
            value: booking.estimated_price || 0,
            country_of_origin: "AU"
          }
        ],

        // Packages array - dimensions
        packages: [
          {
            weight: booking.package_weight || 1,
            length: booking.package_length || 10,
            width: booking.package_width || 10,
            height: booking.package_height || 10
          }
        ]
      }
    };

    const starshipitResponse = await fetch("https://api.starshipit.com/api/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "StarShipIT-Api-Key": starshipitApiKey,
        "Ocp-Apim-Subscription-Key": starshipitSubscriptionKey,
      },
      body: JSON.stringify(starshipitPayload),
    });

    if (!starshipitResponse.ok) {
      const errorText = await starshipitResponse.text();
      console.error("StarShipIt API error:", errorText);
      throw new Error(`StarShipIt API failed: ${starshipitResponse.statusText}`);
    }

    const starshipitData = await starshipitResponse.json();

    const trackingNumber = starshipitData.tracking_number || starshipitData.order?.tracking_number || null;
    const labelUrl = starshipitData.label_url || starshipitData.order?.label_url || null;

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        starshipit_status: "sent",
        starshipit_sent_at: new Date().toISOString(),
        tracking_number: trackingNumber,
        label_url: labelUrl,
      })
      .eq("id", bookingId);

    if (updateError) {
      console.error("Failed to update booking:", updateError);
    }

    if (trackingNumber) {
      try {
        const notificationUrl = `${supabaseUrl}/functions/v1/send-notification`;
        await fetch(notificationUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseServiceKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingId: booking.id,
            customerEmail: booking.customer_email,
            customerName: booking.customer_name,
            trackingNumber: trackingNumber,
            labelUrl: labelUrl,
            orderNumber: `NSJ-${booking.id.substring(0, 8)}`,
          }),
        });
      } catch (notificationError) {
        console.error("Error sending tracking notification:", notificationError);
      }
    }

    const zapierWebhookUrl = Deno.env.get("ZAPIER_WEBHOOK_URL");
    if (zapierWebhookUrl) {
      try {
        await fetch(zapierWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            bookingId: booking.id,
            orderNumber: `NSJ-${booking.id.substring(0, 8)}`,
            trackingNumber: trackingNumber,
            labelUrl: labelUrl,
            starshipitResponse: starshipitData,
            status: "sent_to_starshipit",
          }),
        });
      } catch (zapierError) {
        console.error("Zapier notification error:", zapierError);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Order sent to StarShipIt with Aramex carrier successfully",
        orderNumber: `NSJ-${booking.id.substring(0, 8)}`,
        trackingNumber: trackingNumber,
        labelUrl: labelUrl,
        starshipitOrderId: starshipitData.order_id || starshipitData.order?.order_id || null,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error creating StarShipIt order:", error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});