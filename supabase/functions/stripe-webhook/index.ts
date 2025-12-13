import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const event = await req.json();

    // Handle successful payment
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const bookingId = session.client_reference_id;

      const zapierWebhookFromMetadata = session.metadata?.zapierWebhook;
      const bookingDataFromMetadata = session.metadata?.bookingData;
      const itemsFromMetadata = session.metadata?.items;

      if (zapierWebhookFromMetadata && bookingDataFromMetadata) {
        try {
          const bookingData = JSON.parse(bookingDataFromMetadata);
          const items = itemsFromMetadata ? JSON.parse(itemsFromMetadata) : [];

          await fetch(zapierWebhookFromMetadata, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              payment_status: "paid",
              payment_id: session.id,
              payment_amount: session.amount_total / 100,
              customer_email: session.customer_email,
              bookingData,
              items,
              timestamp: new Date().toISOString()
            }),
          });

          console.log("Payment success sent to Zapier");
        } catch (zapierError) {
          console.error("Error sending to Zapier:", zapierError);
        }

        return new Response(
          JSON.stringify({ success: true, message: "Payment processed and sent to Zapier" }),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );
      }

      if (!bookingId) {
        throw new Error("No booking ID in payment session");
      }

      // Update booking status to paid
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          payment_status: "paid",
          paid_at: new Date().toISOString(),
          status: "confirmed",
          stripe_payment_id: session.id,
        })
        .eq("id", bookingId);

      if (updateError) {
        console.error("Error updating booking:", updateError);
        throw updateError;
      }

      // Get full booking details for user_id
      const { data: fullBooking } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", bookingId)
        .maybeSingle();

      // Send order to Shippit
      try {
        const shippitUrl = `${supabaseUrl}/functions/v1/send-to-shippit`;

        const shippitResponse = await fetch(shippitUrl, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            booking_id: bookingId,
            user_id: fullBooking?.user_id,
          }),
        });

        if (!shippitResponse.ok) {
          console.error(
            "Failed to send order to Shippit:",
            await shippitResponse.text()
          );
        } else {
          console.log("Order sent to Shippit successfully");
        }
      } catch (shippitError) {
        console.error("Error sending to Shippit:", shippitError);
      }

      // Send complete booking data to Zapier
      const zapierWebhook = Deno.env.get("ZAPIER_WEBHOOK_URL");
      if (zapierWebhook) {
        try {
          // Send Shippit-ready format to Zapier
          await fetch(zapierWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              // Payment & Tracking Info
              booking_id: bookingId,
              payment_id: session.id,
              payment_amount: session.amount_total / 100,
              payment_status: "paid",

              // Shippit Order Structure (ready to send)
              shippit_order: {
                order_number: fullBooking?.reference_number || `NSJ-${bookingId.substring(0, 8)}`,
                order_date: fullBooking?.created_at,
                reference: fullBooking?.reference_number || "",
                shipping_method: fullBooking?.service_type || "Standard",
                shipping_description: fullBooking?.package_description || "General Goods",
                currency: "AUD",

                destination: {
                  name: fullBooking?.delivery_name,
                  email: fullBooking?.delivery_email,
                  company: fullBooking?.delivery_company || "",
                  phone: fullBooking?.delivery_phone,
                  street: fullBooking?.delivery_address,
                  suburb: fullBooking?.delivery_suburb,
                  state: "",
                  post_code: fullBooking?.delivery_postcode,
                  country: "AU",
                  delivery_instructions: ""
                },

                items: [
                  {
                    description: fullBooking?.package_description || "General Goods",
                    sku: fullBooking?.reference_number || `NSJ-${bookingId.substring(0, 8)}`,
                    quantity: fullBooking?.quantity || 1,
                    weight: fullBooking?.package_weight,
                    value: fullBooking?.estimated_price || 0,
                    country_of_origin: "AU"
                  }
                ],

                packages: [
                  {
                    weight: fullBooking?.package_weight,
                    length: fullBooking?.package_length,
                    width: fullBooking?.package_width,
                    height: fullBooking?.package_height
                  }
                ]
              }
            }),
          });

          console.log("Booking data sent to Zapier successfully");
        } catch (zapierError) {
          console.error("Zapier webhook error:", zapierError);
        }
      }

      return new Response(
        JSON.stringify({ success: true, message: "Payment processed" }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // For other webhook events, just acknowledge
    return new Response(
      JSON.stringify({ success: true, message: "Event received" }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Webhook processing failed",
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