import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OrderPayload {
  user_id: string;
  platform: string;
  order_id: string;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  pickup_address: string;
  delivery_address: string;
  delivery_city: string;
  delivery_state: string;
  delivery_postcode: string;
  delivery_country?: string;
  products: Array<{
    name: string;
    quantity: number;
    weight?: number;
    sku?: string;
  }>;
  total_weight?: number;
  package_dimensions?: {
    length: number;
    width: number;
    height: number;
  };
  order_total?: number;
  notes?: string;
  payment_status?: string;
  paid?: boolean;
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
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload: OrderPayload = await req.json();

    if (!payload.user_id || !payload.platform || !payload.order_id) {
      throw new Error("Missing required fields: user_id, platform, order_id");
    }

    const totalWeight = payload.total_weight ||
      payload.products.reduce((sum, p) => sum + ((p.weight || 1) * p.quantity), 0) ||
      payload.products.reduce((sum, p) => sum + p.quantity, 0);

    const packageLength = payload.package_dimensions?.length || 30;
    const packageWidth = payload.package_dimensions?.width || 30;
    const packageHeight = payload.package_dimensions?.height || 20;

    const deliveryAddressFull = `${payload.delivery_address}, ${payload.delivery_city}, ${payload.delivery_state} ${payload.delivery_postcode}${payload.delivery_country ? ', ' + payload.delivery_country : ''}`;

    const totalQuantity = payload.products.reduce((sum, p) => sum + p.quantity, 0);

    let estimatedPrice = 15.00;
    try {
      const rateResponse = await fetch(`${supabaseUrl}/functions/v1/get-aramex-rate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fromPostcode: payload.pickup_address.match(/\d{4}/)?.[0] || '3000',
          toPostcode: payload.delivery_postcode,
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

    const isPaid = payload.paid === true || payload.payment_status === "paid";
    const bookingStatus = isPaid ? "confirmed" : "pending_payment";
    const paymentStatus = isPaid ? "paid" : "pending";

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        user_id: payload.user_id,
        pickup_address: payload.pickup_address,
        pickup_postcode: payload.pickup_address.match(/\d{4}/)?.[0] || '',
        delivery_address: deliveryAddressFull,
        delivery_postcode: payload.delivery_postcode,
        package_weight: totalWeight,
        package_length: packageLength,
        package_width: packageWidth,
        package_height: packageHeight,
        quantity: totalQuantity,
        customer_name: payload.customer_name,
        customer_email: payload.customer_email,
        customer_phone: payload.customer_phone || '',
        estimated_price: estimatedPrice,
        status: bookingStatus,
        payment_status: paymentStatus,
        paid_at: isPaid ? new Date().toISOString() : null,
        package_description: payload.products.map(p => `${p.name} (x${p.quantity})`).join(', '),
        reference_number: `${payload.platform.toUpperCase()}-${payload.order_number}`,
      })
      .select()
      .single();

    if (bookingError || !booking) {
      throw new Error(`Failed to create booking: ${bookingError?.message}`);
    }

    const { error: integrationError } = await supabase
      .from("integrations")
      .update({
        last_sync_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("user_id", payload.user_id)
      .eq("platform", payload.platform.toLowerCase());

    if (integrationError) {
      console.error("Failed to update integration:", integrationError);
    }

    if (isPaid) {
      try {
        const shippitUrl = `${supabaseUrl}/functions/v1/send-to-shippit`;
        await fetch(shippitUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            booking_id: booking.id,
            user_id: payload.user_id,
          }),
        });
      } catch (error) {
        console.error("Failed to send to Shippit:", error);
      }
    }

    const zapierWebhookUrl = Deno.env.get("ZAPIER_WEBHOOK_URL");
    if (zapierWebhookUrl) {
      try {
        const amountInCents = Math.round(estimatedPrice * 100);

        await fetch(zapierWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            order: {
              booking_id: booking.id,
              order_number: payload.order_number,
              platform: payload.platform,
              order_date: new Date().toISOString(),
              delivery_address: deliveryAddressFull,
              delivery_country: payload.delivery_country || "AU",
              pickup_address: payload.pickup_address,
              pickup_country: "AU",
              packages: [{
                weight: totalWeight,
                length: packageLength,
                width: packageWidth,
                height: packageHeight,
                quantity: totalQuantity,
              }],
              customer_name: payload.customer_name,
              customer_email: payload.customer_email,
              customer_phone: payload.customer_phone || "",
              estimated_price: estimatedPrice,
              products: payload.products,
            },
            stripe_checkout: {
              amount: amountInCents,
              currency: "AUD",
              product_name: `Shipping Service - Order #${payload.order_number}`,
              customer_email: payload.customer_email,
              success_url: `${Deno.env.get("APP_URL") || "https://nsjexpress.com.au"}/payment-success?booking_id=${booking.id}`,
              cancel_url: `${Deno.env.get("APP_URL") || "https://nsjexpress.com.au"}/payment-cancelled?booking_id=${booking.id}`,
              booking_id: booking.id,
              metadata: {
                booking_id: booking.id,
                order_number: payload.order_number,
                platform: payload.platform,
              },
            },
            source: "NSJ Express Universal Webhook",
            timestamp: new Date().toISOString(),
            payment_status: paymentStatus,
          }),
        });
      } catch (error) {
        console.error("Failed to send to Zapier:", error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Order received and booking created",
        bookingId: booking.id,
        orderNumber: payload.order_number,
        platform: payload.platform,
        estimatedPrice: estimatedPrice,
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
        success: false,
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