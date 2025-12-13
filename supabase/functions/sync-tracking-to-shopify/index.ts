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

    const { bookingId, trackingNumber, trackingUrl } = await req.json();

    if (!bookingId || !trackingNumber) {
      throw new Error("Missing required parameters");
    }

    const { data: shopifyOrder, error: orderError } = await supabase
      .from("shopify_orders")
      .select(`
        *,
        shopify_stores (
          shop_domain,
          access_token
        )
      `)
      .eq("booking_id", bookingId)
      .maybeSingle();

    if (orderError || !shopifyOrder) {
      throw new Error("Shopify order not found");
    }

    const store = shopifyOrder.shopify_stores;
    const shopDomain = store.shop_domain;
    const accessToken = store.access_token;

    const fulfillmentPayload = {
      fulfillment: {
        location_id: null,
        tracking_number: trackingNumber,
        tracking_url: trackingUrl || `https://nsjexpress.com/track/${trackingNumber}`,
        notify_customer: true,
        line_items: [],
      },
    };

    const fulfillmentResponse = await fetch(
      `https://${shopDomain}/admin/api/2024-01/orders/${shopifyOrder.shopify_order_id}/fulfillments.json`,
      {
        method: "POST",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(fulfillmentPayload),
      }
    );

    if (!fulfillmentResponse.ok) {
      const errorText = await fulfillmentResponse.text();
      console.error("Shopify fulfillment error:", errorText);
      throw new Error(`Failed to create fulfillment: ${errorText}`);
    }

    const fulfillmentData = await fulfillmentResponse.json();

    const { error: updateError } = await supabase
      .from("shopify_orders")
      .update({
        tracking_number: trackingNumber,
        tracking_url: trackingUrl || `https://nsjexpress.com/track/${trackingNumber}`,
        fulfillment_status: "fulfilled",
        synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", shopifyOrder.id);

    if (updateError) {
      console.error("Failed to update order:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Tracking synced to Shopify",
        fulfillmentId: fulfillmentData.fulfillment?.id,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Sync error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Sync failed",
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
