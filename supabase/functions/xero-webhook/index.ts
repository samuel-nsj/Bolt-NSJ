import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    const zapierWebhook = Deno.env.get("ZAPIER_WEBHOOK_URL")!;

    const supabase = createClient(supabaseUrl, supabaseKey);
    const payload = await req.json();

    console.log("Received Xero webhook:", payload);

    // Xero sends payment notifications
    if (payload.events) {
      for (const event of payload.events) {
        if (event.eventType === "UPDATE" && event.eventCategory === "INVOICE") {
          const invoiceId = event.resourceId;

          // Find booking by Xero invoice ID
          const { data: booking, error: fetchError } = await supabase
            .from("bookings")
            .select("*")
            .eq("xero_invoice_id", invoiceId)
            .maybeSingle();

          if (fetchError || !booking) {
            console.log("Booking not found for invoice:", invoiceId);
            continue;
          }

          // Verify invoice payment status with Xero API
          const xeroClientId = "23C09ACC39CD4528B30E260160F67600";
          const xeroClientSecret = "AcWMPUAlV1mkpworK1MUx_Z2ezYdkE747TQgrQ_NuNBIbTwa";
          const xeroTenantId = "991574c9-554c-471d-a610-9c86fe699498";
          const xeroTokenUrl = "https://identity.xero.com/connect/token";
          const xeroApiUrl = "https://api.xero.com/api.xro/2.0";

          // Get Xero access token
          const tokenResponse = await fetch(xeroTokenUrl, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
              grant_type: "client_credentials",
              client_id: xeroClientId,
              client_secret: xeroClientSecret,
            }),
          });

          if (!tokenResponse.ok) {
            console.error("Failed to get Xero access token");
            continue;
          }

          const { access_token } = await tokenResponse.json();

          // Get invoice details from Xero
          const invoiceResponse = await fetch(`${xeroApiUrl}/Invoices/${invoiceId}`, {
            headers: {
              "Authorization": `Bearer ${access_token}`,
              "xero-tenant-id": xeroTenantId,
              "Accept": "application/json",
            },
          });

          if (!invoiceResponse.ok) {
            console.error("Failed to get invoice from Xero");
            continue;
          }

          const invoiceData = await invoiceResponse.json();
          const invoice = invoiceData.Invoices[0];

          // Only proceed if invoice is PAID
          if (invoice.Status !== "PAID") {
            console.log("Invoice not paid yet:", invoiceId, "Status:", invoice.Status);
            continue;
          }

          // Update booking status to paid
          await supabase
            .from("bookings")
            .update({
              status: "paid",
              payment_status: "paid",
              payment_amount: invoice.AmountPaid,
              paid_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", booking.id);

          // Send to StarShipIt via Zapier (Create Order)
          const starShipItPayload = {
            order: {
              order_number: `NSJ-${booking.id}`,
              order_date: new Date().toISOString(),
              delivery_address: booking.delivery_address,
              delivery_country: "AU",
              pickup_address: booking.pickup_address,
              pickup_country: "AU",
              items: [{
                quantity: booking.quantity || 1,
                weight: parseFloat(booking.package_weight),
                value: parseFloat(booking.estimated_price),
                tariff_code: "",
                country_of_origin: "AU",
              }],
              packages: [{
                quantity: 1,
                weight: parseFloat(booking.package_weight),
                height: parseFloat(booking.package_height),
                width: parseFloat(booking.package_width),
                length: parseFloat(booking.package_length),
              }],
              customer_name: booking.customer_name,
              customer_email: booking.customer_email,
              customer_phone: booking.customer_phone,
              estimated_price: parseFloat(booking.estimated_price),
            },
            source: "NSJ Express",
            timestamp: new Date().toISOString(),
            payment_status: "paid",
            xero_invoice_id: invoiceId,
          };

          await fetch(zapierWebhook, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(starShipItPayload),
          });

          console.log("Order sent to StarShipIt:", booking.id);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error processing Xero webhook:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
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
