import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ShopifyRateRequest {
  rate: {
    origin: {
      country: string;
      postal_code: string;
      province: string;
      city: string;
      address1: string;
    };
    destination: {
      country: string;
      postal_code: string;
      province: string;
      city: string;
      address1: string;
    };
    items: Array<{
      name: string;
      sku: string;
      quantity: number;
      grams: number;
      price: number;
    }>;
    currency: string;
  };
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

    const payload: ShopifyRateRequest = await req.json();
    const { rate } = payload;

    const totalWeight = rate.items.reduce((sum, item) => sum + (item.grams * item.quantity), 0) / 1000;

    const defaultLength = 30;
    const defaultWidth = 30;
    const defaultHeight = 20;

    const rateResponse = await fetch(`${supabaseUrl}/functions/v1/get-aramex-rate`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fromPostcode: rate.origin.postal_code || '3000',
        toPostcode: rate.destination.postal_code,
        weight: totalWeight || 1,
        length: defaultLength,
        width: defaultWidth,
        height: defaultHeight,
      }),
    });

    const rateData = await rateResponse.json();
    let shippingRate = 15.00;

    if (rateData.success && rateData.rate) {
      shippingRate = rateData.rate;
    }

    const response = {
      rates: [
        {
          service_name: "NSJ Express Standard",
          service_code: "NSJ_STANDARD",
          total_price: (shippingRate * 100).toString(),
          currency: rate.currency,
          description: "Fast and reliable shipping via NSJ Express",
          min_delivery_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          max_delivery_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
        {
          service_name: "NSJ Express Priority",
          service_code: "NSJ_PRIORITY",
          total_price: ((shippingRate * 1.5) * 100).toString(),
          currency: rate.currency,
          description: "Express shipping via NSJ Express",
          min_delivery_date: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          max_delivery_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        }
      ]
    };

    return new Response(
      JSON.stringify(response),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Carrier service error:", error);
    return new Response(
      JSON.stringify({
        rates: []
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});