import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey, X-Shopify-Shop-Domain, X-Shopify-Hmac-Sha256",
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

    const shopDomain = req.headers.get("X-Shopify-Shop-Domain");

    if (!shopDomain) {
      throw new Error("Missing shop domain header");
    }

    const order = await req.json();

    let store = null;
    const { data: existingStore, error: storeError } = await supabase
      .from("shopify_stores")
      .select("*")
      .eq("shop_domain", shopDomain)
      .maybeSingle();

    if (storeError) {
      throw new Error(`Database error: ${storeError.message}`);
    }

    if (!existingStore) {
      const { data: newStore, error: insertError } = await supabase
        .from("shopify_stores")
        .insert({
          shop_domain: shopDomain,
          shop_name: shopDomain.split('.')[0],
          auto_create_bookings: true,
          store_type: 'webhook',
          is_active: true,
        })
        .select()
        .single();

      if (insertError || !newStore) {
        throw new Error(`Failed to register store: ${shopDomain}`);
      }
      store = newStore;
    } else {
      store = existingStore;
    }

    if (!store.auto_create_bookings) {
      return new Response(
        JSON.stringify({ message: "Auto-booking disabled for this store" }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const shippingAddress = order.shipping_address;
    const deliveryAddress = `${shippingAddress.address1}, ${shippingAddress.city}, ${shippingAddress.province_code} ${shippingAddress.zip}`;

    let totalWeight = 0;
    if (order.total_weight) {
      totalWeight = parseFloat(order.total_weight) / 1000;
    } else {
      totalWeight = order.line_items.length * 1.0;
    }

    const packageLength = 30;
    const packageWidth = 30;
    const packageHeight = 20;

    const pickupAddress = store.default_pickup_address || "Warehouse, Sydney, NSW 2000";

    let estimatedPrice = 15.00;
    try {
      const rateResponse = await fetch(`${supabaseUrl}/functions/v1/get-aramex-rate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromPostcode: pickupAddress.match(/\d{4}/)?.[0] || '3000',
          toPostcode: shippingAddress.zip,
          weight: totalWeight,
          length: packageLength,
          width: packageWidth,
          height: packageHeight,
        }),
      });

      const rateData = await rateResponse.json();
      if (rateData.success && rateData.rate) {
        estimatedPrice = rateData.rate;
      }
    } catch (error) {
      console.error('Error fetching rate:', error);
    }

    const isPaid = order.financial_status === "paid";
    const bookingStatus = isPaid ? "confirmed" : "pending_payment";
    const paymentStatus = isPaid ? "paid" : "pending";

    const bookingData: any = {
        user_id: store.user_id || '00000000-0000-0000-0000-000000000000',
        pickup_address: pickupAddress,
        pickup_postcode: pickupAddress.match(/\d{4}/)?.[0] || '',
        delivery_address: deliveryAddress,
        delivery_postcode: shippingAddress.zip,
        package_weight: totalWeight,
        package_length: packageLength,
        package_width: packageWidth,
        package_height: packageHeight,
        quantity: order.line_items.length,
        customer_name: `${shippingAddress.first_name} ${shippingAddress.last_name}`,
        customer_email: order.email || order.customer?.email || store.shop_email,
        customer_phone: shippingAddress.phone || order.customer?.phone || "",
        estimated_price: estimatedPrice,
        status: bookingStatus,
        payment_status: paymentStatus,
        paid_at: isPaid ? new Date().toISOString() : null,
        package_description: order.line_items.map((item: any) => `${item.name} (x${item.quantity})`).join(', '),
        reference_number: `SHOPIFY-${order.name || order.order_number}`,
    };

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert(bookingData)
      .select()
      .single();

    if (bookingError || !booking) {
      throw new Error("Failed to create booking");
    }

    const { error: orderError } = await supabase
      .from("shopify_orders")
      .insert({
        store_id: store.id,
        shopify_order_id: order.id.toString(),
        order_number: order.name || order.order_number?.toString(),
        booking_id: booking.id,
        customer_email: order.email || order.customer?.email || "",
        customer_name: `${shippingAddress.first_name} ${shippingAddress.last_name}`,
        customer_phone: shippingAddress.phone || "",
        shipping_address: shippingAddress,
        total_weight: totalWeight,
        order_total: parseFloat(order.total_price || "0"),
        fulfillment_status: "pending",
      });

    if (orderError) {
      console.error("Failed to create shopify order record:", orderError);
    }

    if (isPaid) {
      try {
        const shippitUrl = `${supabaseUrl}/functions/v1/send-to-shippit`;
        const shippitResponse = await fetch(shippitUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            booking_id: booking.id,
            user_id: store.user_id,
          }),
        });

        if (shippitResponse.ok) {
          const shippitData = await shippitResponse.json();

          if (shippitData.tracking_number) {
            await fetch(`${supabaseUrl}/functions/v1/sync-tracking-to-shopify`, {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                orderId: order.id.toString(),
                trackingNumber: shippitData.tracking_number,
                trackingUrl: `https://track.shippit.com/${shippitData.tracking_number}`,
                shopDomain: shopDomain,
              }),
            });
          }
        }
      } catch (error) {
        console.error("Failed to send to Shippit:", error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Order received and booking created",
        bookingId: booking.id,
        orderNumber: order.name,
        sent_to_shippit: isPaid,
      }),
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