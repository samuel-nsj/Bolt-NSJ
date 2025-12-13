import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface WebhookPayload {
  user_id: string;
  platform: string;
  status: string;
  store_name?: string;
  store_url?: string;
  api_credentials?: any;
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
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: WebhookPayload = await req.json();

    if (!payload.user_id || !payload.platform) {
      throw new Error("Missing required fields: user_id and platform");
    }

    const { data: existingIntegration, error: fetchError } = await supabase
      .from("integrations")
      .select("*")
      .eq("user_id", payload.user_id)
      .eq("platform", payload.platform)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (existingIntegration) {
      const updateData: any = {
        status: payload.status || "connected",
        connected_at: payload.status === "connected" ? new Date().toISOString() : existingIntegration.connected_at,
        last_sync_at: new Date().toISOString(),
        error_message: null,
      };

      if (payload.store_name) updateData.store_name = payload.store_name;
      if (payload.store_url) updateData.store_url = payload.store_url;
      if (payload.api_credentials) updateData.api_credentials = payload.api_credentials;

      const { error: updateError } = await supabase
        .from("integrations")
        .update(updateData)
        .eq("id", existingIntegration.id);

      if (updateError) throw updateError;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Integration updated successfully",
          integration_id: existingIntegration.id,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    } else {
      const insertData: any = {
        user_id: payload.user_id,
        platform: payload.platform,
        status: payload.status || "connected",
        connected_at: payload.status === "connected" ? new Date().toISOString() : null,
        last_sync_at: new Date().toISOString(),
      };

      if (payload.store_name) insertData.store_name = payload.store_name;
      if (payload.store_url) insertData.store_url = payload.store_url;
      if (payload.api_credentials) insertData.api_credentials = payload.api_credentials;

      const { data: newIntegration, error: insertError } = await supabase
        .from("integrations")
        .insert([insertData])
        .select()
        .single();

      if (insertError) throw insertError;

      return new Response(
        JSON.stringify({
          success: true,
          message: "Integration created successfully",
          integration_id: newIntegration.id,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }
  } catch (error) {
    console.error("Webhook error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
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