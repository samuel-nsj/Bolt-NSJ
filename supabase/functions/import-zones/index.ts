import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ZoneData {
  suburb: string;
  postcode: string;
  commercial_category: string;
  region: string;
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
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get zones data from request body
    const { zones } = await req.json() as { zones: ZoneData[] };

    if (!zones || !Array.isArray(zones)) {
      return new Response(
        JSON.stringify({ error: "Invalid zones data" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Clear existing zones (optional - comment out if you want to append)
    // await supabase.from('zones').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    // Insert zones in batches
    const batchSize = 100;
    let imported = 0;
    const errors: string[] = [];

    for (let i = 0; i < zones.length; i += batchSize) {
      const batch = zones.slice(i, i + batchSize);

      const { error } = await supabase
        .from('zones')
        .insert(batch);

      if (error) {
        errors.push(`Batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        continue;
      }

      imported += batch.length;
    }

    return new Response(
      JSON.stringify({
        success: true,
        imported,
        total: zones.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error importing zones:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
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
