import "jsr:@supabase/functions-js/edge-runtime.d.ts";

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
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeSecretKey) {
      throw new Error("Stripe secret key not configured");
    }

    const { sessionId } = await req.json();

    if (!sessionId) {
      throw new Error("Missing sessionId");
    }

    const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: {
        "Authorization": `Bearer ${stripeSecretKey}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Stripe API error:", errorText);
      throw new Error("Failed to retrieve session");
    }

    const session = await response.json();

    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: session.payment_intent,
        customerEmail: session.customer_details?.email || session.customer_email,
        amountTotal: session.amount_total / 100,
        paymentStatus: session.payment_status,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error retrieving session:", error);
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