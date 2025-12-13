import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ShippitOrder {
  booking_id: string;
  user_id: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const shippitApiKey = Deno.env.get("VITE_STARSHIPIT_API_KEY");

    if (!shippitApiKey) {
      throw new Error("Shippit API key not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload: ShippitOrder = await req.json();

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", payload.booking_id)
      .single();

    if (bookingError || !booking) {
      throw new Error("Booking not found");
    }

    if (booking.payment_status !== "paid") {
      throw new Error("Order must be paid before sending to Shippit");
    }

    const shippitPayload = {
      order: {
        user_attributes: {
          email: booking.customer_email,
          first_name: booking.customer_name.split(' ')[0],
          last_name: booking.customer_name.split(' ').slice(1).join(' ') || booking.customer_name,
          phone: booking.customer_phone,
        },
        delivery_attributes: {
          address: booking.delivery_address.split(',')[0],
          suburb: booking.delivery_address.split(',')[1]?.trim() || '',
          postcode: booking.delivery_postcode,
          state: booking.delivery_address.match(/NSW|VIC|QLD|SA|WA|TAS|NT|ACT/)?.[0] || '',
          country: "AU",
          delivery_instructions: booking.package_description || "",
        },
        parcel_attributes: [
          {
            weight: booking.package_weight,
            length: booking.package_length,
            width: booking.package_width,
            height: booking.package_height,
            description: booking.package_description || "Package",
          }
        ],
        retailer_order_number: booking.reference_number || booking.id,
        courier_type: "Standard",
      }
    };

    const shippitResponse = await fetch("https://api.shippit.com/v3/orders", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${shippitApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(shippitPayload),
    });

    const shippitData = await shippitResponse.json();

    if (!shippitResponse.ok) {
      throw new Error(`Shippit API error: ${JSON.stringify(shippitData)}`);
    }

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        status: "confirmed",
        starshipit_order_id: shippitData.response?.order_id || shippitData.order?.id,
        tracking_number: shippitData.response?.tracking_number || shippitData.order?.tracking_number,
      })
      .eq("id", booking.id);

    if (updateError) {
      console.error("Failed to update booking:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Order sent to Shippit successfully",
        shippit_order_id: shippitData.response?.order_id || shippitData.order?.id,
        tracking_number: shippitData.response?.tracking_number || shippitData.order?.tracking_number,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Shippit error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to send order to Shippit",
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});