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
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const shop = url.searchParams.get("shop");
    const state = url.searchParams.get("state");

    if (!code || !shop) {
      throw new Error("Missing code or shop parameter");
    }

    const shopifyApiKey = Deno.env.get("SHOPIFY_API_KEY");
    const shopifyApiSecret = Deno.env.get("SHOPIFY_API_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!shopifyApiKey || !shopifyApiSecret) {
      throw new Error("Shopify API credentials not configured");
    }

    const accessTokenUrl = `https://${shop}/admin/oauth/access_token`;
    const tokenResponse = await fetch(accessTokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: shopifyApiKey,
        client_secret: shopifyApiSecret,
        code: code,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to get access token from Shopify");
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    const shopDataResponse = await fetch(`https://${shop}/admin/api/2024-01/shop.json`, {
      headers: {
        "X-Shopify-Access-Token": accessToken,
      },
    });

    if (!shopDataResponse.ok) {
      throw new Error("Failed to get shop data");
    }

    const shopData = await shopDataResponse.json();
    const shopInfo = shopData.shop;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const userId = state;

    const { error: insertError } = await supabase
      .from("shopify_stores")
      .upsert({
        user_id: userId,
        shop_domain: shop,
        access_token: accessToken,
        shop_name: shopInfo.name,
        shop_email: shopInfo.email,
        shop_owner: shopInfo.shop_owner,
        is_active: true,
        installed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: "shop_domain",
      });

    if (insertError) {
      throw insertError;
    }

    const webhookUrl = `${supabaseUrl}/functions/v1/shopify-webhook`;
    const webhookResponse = await fetch(`https://${shop}/admin/api/2024-01/webhooks.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        webhook: {
          topic: "orders/create",
          address: webhookUrl,
          format: "json",
        },
      }),
    });

    if (webhookResponse.ok) {
      const webhookData = await webhookResponse.json();
      await supabase
        .from("shopify_stores")
        .update({ webhook_id: webhookData.webhook.id.toString() })
        .eq("shop_domain", shop);
    }

    const carrierServiceUrl = `${supabaseUrl}/functions/v1/shopify-carrier-service`;
    const carrierServiceResponse = await fetch(`https://${shop}/admin/api/2024-01/carrier_services.json`, {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        carrier_service: {
          name: "NSJ Express",
          callback_url: carrierServiceUrl,
          service_discovery: true,
        },
      }),
    });

    if (carrierServiceResponse.ok) {
      const carrierData = await carrierServiceResponse.json();
      await supabase
        .from("shopify_stores")
        .update({
          carrier_service_id: carrierData.carrier_service.id.toString(),
          auto_create_bookings: true
        })
        .eq("shop_domain", shop);
    }

    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Installation Successful</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .success { color: #10b981; font-size: 24px; margin-bottom: 20px; }
          .message { color: #6b7280; margin-bottom: 30px; }
          .button { background: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="success">✓ Installation Successful!</div>
        <div class="message">Your Shopify store has been connected to NSJ Express</div>
        <a href="${supabaseUrl.replace('/functions/v1', '')}/dashboard" class="button">Go to Dashboard</a>
      </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          "Content-Type": "text/html",
        },
      }
    );
  } catch (error) {
    console.error("OAuth error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "OAuth failed",
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