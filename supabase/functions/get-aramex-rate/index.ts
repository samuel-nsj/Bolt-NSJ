import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { getZoneCode, calculateRate } from "./pricing-data.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface QuoteItem {
  itemType: string;
  quantity: number;
  weight: number;
  length: number;
  width: number;
  height: number;
}

interface RateRequest {
  fromPostcode: string;
  toPostcode: string;
  weight?: number;
  length?: number;
  width?: number;
  height?: number;
  items?: QuoteItem[];
}

// Helper to map postcode to zone
function postcodeToZone(postcode: string): string | null {
  const pc = parseInt(postcode);

  // Sydney metro
  if ((pc >= 2000 && pc <= 2249) || (pc >= 2555 && pc <= 2574) || (pc >= 2740 && pc <= 2786)) return 'SYD';

  // Melbourne metro
  if ((pc >= 3000 && pc <= 3211) || (pc >= 3335 && pc <= 3341) || (pc >= 3427 && pc <= 3429) ||
      (pc >= 3750 && pc <= 3811) || (pc >= 3910 && pc <= 3920) || (pc >= 3926 && pc <= 3944) ||
      (pc >= 3975 && pc <= 3978) || (pc >= 3980 && pc <= 3983)) return 'MEL';

  // Brisbane metro
  if ((pc >= 4000 && pc <= 4207) || (pc >= 4500 && pc <= 4519) || (pc >= 4550 && pc <= 4575)) return 'BRI';

  // Adelaide metro
  if ((pc >= 5000 && pc <= 5199) || (pc >= 5800 && pc <= 5950)) return 'ADL';

  // Perth metro
  if ((pc >= 6000 && pc <= 6214) || (pc >= 6800 && pc <= 6997)) return 'PER';

  // Gold Coast
  if (pc >= 4210 && pc <= 4230) return 'GLD';

  // Canberra
  if ((pc >= 2600 && pc <= 2618) || (pc >= 2900 && pc <= 2920)) return 'CBR';

  // Newcastle
  if ((pc >= 2250 && pc <= 2310) || (pc >= 2315 && pc <= 2324)) return 'NEW';

  // Wollongong
  if (pc >= 2500 && pc <= 2534) return 'WOL';

  // Geelong
  if (pc >= 3212 && pc <= 3334) return 'GEE';

  // Cairns
  if (pc >= 4870 && pc <= 4879) return 'CNS';

  // Townsville
  if (pc >= 4810 && pc <= 4817) return 'TVL';

  // Hobart/Tasmania
  if (pc >= 7000 && pc <= 7999) return 'TAS';

  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { fromPostcode, toPostcode, weight, length = 30, width = 30, height = 30, items }: RateRequest = await req.json();

    if (!fromPostcode || !toPostcode) {
      throw new Error("Missing required fields: fromPostcode, toPostcode");
    }

    let totalWeight = 0;

    if (items && items.length > 0) {
      totalWeight = items.reduce((sum, item) => sum + (item.weight * item.quantity), 0);
    } else if (weight) {
      totalWeight = weight;
    } else {
      throw new Error("Either weight or items array is required");
    }

    if (totalWeight > 25) {
      throw new Error("Maximum total weight is 25kg");
    }

    const fromZone = postcodeToZone(fromPostcode);
    const toZone = postcodeToZone(toPostcode);

    if (!fromZone || !toZone) {
      throw new Error("Unable to determine zone for provided postcodes");
    }

    const rate = calculateRate(fromZone, toZone, totalWeight);

    if (rate === null) {
      throw new Error("No rate available for this route");
    }

    return new Response(
      JSON.stringify({
        success: true,
        rate: rate,
        carrier: "Aramex",
        service: "Standard",
        fromZone,
        toZone,
        totalWeight,
        itemCount: items?.length || 1,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error calculating rate:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Failed to calculate rate",
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