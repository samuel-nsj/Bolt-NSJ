import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InvoiceRequest {
  bookingId: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  description: string;
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
    const xeroClientId = "23C09ACC39CD4528B30E260160F67600";
    const xeroClientSecret = "AcWMPUAlV1mkpworK1MUx_Z2ezYdkE747TQgrQ_NuNBIbTwa";
    const xeroTenantId = "991574c9-554c-471d-a610-9c86fe699498";
    const xeroTokenUrl = "https://identity.xero.com/connect/token";
    const xeroApiUrl = "https://api.xero.com/api.xro/2.0";

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { bookingId, customerName, customerEmail, amount, description }: InvoiceRequest = await req.json();

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
      throw new Error("Failed to get Xero access token");
    }

    const { access_token } = await tokenResponse.json();

    // Create invoice in Xero
    const invoice = {
      Type: "ACCREC",
      Contact: {
        Name: customerName,
        EmailAddress: customerEmail,
      },
      LineItems: [
        {
          Description: description,
          Quantity: 1,
          UnitAmount: amount,
          AccountCode: "200",
          TaxType: "OUTPUT",
        },
      ],
      Date: new Date().toISOString().split("T")[0],
      DueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      Reference: `NSJ-${bookingId}`,
      Status: "AUTHORISED",
    };

    const xeroResponse = await fetch(`${xeroApiUrl}/Invoices`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${access_token}`,
        "xero-tenant-id": xeroTenantId,
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({ Invoices: [invoice] }),
    });

    if (!xeroResponse.ok) {
      const errorText = await xeroResponse.text();
      throw new Error(`Xero API error: ${errorText}`);
    }

    const xeroData = await xeroResponse.json();
    const createdInvoice = xeroData.Invoices[0];

    // Update booking with invoice ID and Xero reference
    await supabase
      .from("bookings")
      .update({
        status: "pending_payment",
        xero_invoice_id: createdInvoice.InvoiceID,
        xero_invoice_number: createdInvoice.InvoiceNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    return new Response(
      JSON.stringify({
        success: true,
        invoice: createdInvoice,
        invoiceUrl: `https://go.xero.com/organisationlogin/default.aspx?shortcode=${xeroTenantId}&redirecturl=/AccountsReceivable/View.aspx?InvoiceID=${createdInvoice.InvoiceID}`,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error creating Xero invoice:", error);
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