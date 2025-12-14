import { createClient } from 'npm:@supabase/supabase-js@2';
import { AramexConnectClient } from '../_shared/aramex-connect-client.ts';
import { AuthService } from '../_shared/auth.ts';
import { MarkupEngine } from '../_shared/markup.ts';
import { RateLimiter } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

const rateLimiter = new RateLimiter(60000, 50);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const startTime = Date.now();

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  );

  try {
    const authHeader = req.headers.get('Authorization');

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authService = new AuthService();
    const authContext = await authService.authenticate(authHeader);

    if (!authContext || !authContext.isAuthenticated) {
      return new Response(
        JSON.stringify({ error: 'Invalid authentication credentials' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (rateLimiter.isRateLimited(authContext.customerId)) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Maximum 50 requests per minute allowed',
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    let { shipper, consignee, items } = body;

    if (!shipper || !consignee || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: {
            shipper: 'Nested: { address: { line1, city, state, postCode, countryCode? }, contact: { name, phone, email } } OR Flat: { name, address, city, state?, postcode, phone, email, countryCode? }',
            consignee: 'Nested: { address: { line1, city, state, postCode, countryCode? }, contact: { name, phone, email } } OR Flat: { name, address, city, state?, postcode, phone, email, countryCode? }',
            items: [{ weight: 'number', length: 'number', width: 'number', height: 'number', quantity: 'number (optional)', description: 'string (optional)' }]
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize flat structure to nested structure for backward compatibility
    const normalizeParty = (party: any) => {
      // Check if already in nested format
      if (party.address && typeof party.address === 'object' && party.contact) {
        return party;
      }
      // Convert flat to nested
      return {
        address: {
          line1: party.address,
          city: party.city,
          state: party.state,
          postCode: party.postcode,
          countryCode: party.countryCode,
        },
        contact: {
          name: party.name,
          phone: party.phone,
          email: party.email,
        },
      };
    };

    shipper = normalizeParty(shipper);
    consignee = normalizeParty(consignee);

    // Validate shipper address and contact
    if (!shipper.address || !shipper.contact) {
      return new Response(
        JSON.stringify({ error: 'Missing required shipper fields', required: ['address', 'contact'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!shipper.address.line1 || !shipper.address.city || !shipper.address.postCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required shipper address fields', required: ['line1', 'city', 'postCode'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!shipper.contact.name || !shipper.contact.phone || !shipper.contact.email) {
      return new Response(
        JSON.stringify({ error: 'Missing required shipper contact fields', required: ['name', 'phone', 'email'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate consignee address and contact
    if (!consignee.address || !consignee.contact) {
      return new Response(
        JSON.stringify({ error: 'Missing required consignee fields', required: ['address', 'contact'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!consignee.address.line1 || !consignee.address.city || !consignee.address.postCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required consignee address fields', required: ['line1', 'city', 'postCode'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!consignee.contact.name || !consignee.contact.phone || !consignee.contact.email) {
      return new Response(
        JSON.stringify({ error: 'Missing required consignee contact fields', required: ['name', 'phone', 'email'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate state is present (required for Aramex)
    if (!shipper.address.state) {
      return new Response(
        JSON.stringify({ error: 'Missing required shipper state field', message: 'State is required for Australian addresses' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!consignee.address.state) {
      return new Response(
        JSON.stringify({ error: 'Missing required consignee state field', message: 'State is required for Australian addresses' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper function to extract item dimensions
    const extractItemDimensions = (item: any) => ({
      weight: item.weight?.value ?? item.weight,
      length: item.dimensions?.length ?? item.length,
      width: item.dimensions?.width ?? item.width,
      height: item.dimensions?.height ?? item.height,
    });

    // Validate items have all required dimensions
    for (const item of items) {
      const { weight, length, width, height } = extractItemDimensions(item);
      if (
        weight == null ||
        length == null ||
        width == null ||
        height == null
      ) {
        return new Response(
          JSON.stringify({ error: 'Missing required item fields', required: ['weight (flat) or weight.value (nested)', 'length (flat) or dimensions.length (nested)', 'width (flat) or dimensions.width (nested)', 'height (flat) or dimensions.height (nested)'] }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Create new variables with defaulted countryCode to avoid mutating the original payload
    const shipperCountryCode = shipper.address.countryCode || 'AU';
    const consigneeCountryCode = consignee.address.countryCode || 'AU';

    const { data: customer } = await supabase
      .from('api_customers')
      .select('*')
      .eq('id', authContext.customerId)
      .eq('is_active', true)
      .maybeSingle();

    if (!customer) {
      return new Response(
        JSON.stringify({ error: 'Customer account not found or inactive' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aramexClient = new AramexConnectClient();

    const quoteResult = await aramexClient.getRates({
      shipper: {
        name: shipper.contact.name,
        address: shipper.address.line1,
        city: shipper.address.city,
        state: shipper.address.state,
        postcode: shipper.address.postCode,
        phone: shipper.contact.phone,
        email: shipper.contact.email,
        countryCode: shipperCountryCode,
      },
      consignee: {
        name: consignee.contact.name,
        address: consignee.address.line1,
        city: consignee.address.city,
        state: consignee.address.state,
        postcode: consignee.address.postCode,
        phone: consignee.contact.phone,
        email: consignee.contact.email,
        countryCode: consigneeCountryCode,
      },
      items: items.map((item: any) => {
        const dims = extractItemDimensions(item);
        return {
          weight: typeof dims.weight === 'number' ? dims.weight : parseFloat(String(dims.weight)),
          length: typeof dims.length === 'number' ? dims.length : parseFloat(String(dims.length)),
          width: typeof dims.width === 'number' ? dims.width : parseFloat(String(dims.width)),
          height: typeof dims.height === 'number' ? dims.height : parseFloat(String(dims.height)),
          quantity: item.quantity ? parseInt(item.quantity) : 1,
          description: item.description,
        };
      }),
    });

    if (!quoteResult.success || !quoteResult.rates) {
      await supabase.from('api_request_logs').insert({
        customer_id: authContext.customerId,
        log_type: 'quote',
        endpoint: '/api-quote',
        request_data: body,
        response_data: quoteResult,
        status_code: 400,
        error_message: quoteResult.error,
        duration_ms: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify({
          error: 'Failed to get quote from AramexConnect',
          details: quoteResult.error,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const quotesWithMarkup = quoteResult.rates.map(rate => {
      const pricing = MarkupEngine.applyMarkup(rate.baseAmount, {
        type: customer.markup_type as 'percentage' | 'fixed',
        value: parseFloat(customer.markup_value),
      });

      return {
        serviceType: rate.serviceType,
        serviceName: rate.serviceName,
        baseAmount: rate.baseAmount,
        baseCost: pricing.baseCost,
        markupAmount: pricing.markupAmount,
        totalCost: pricing.totalCost,
        currency: rate.currency,
        transitDays: rate.transitDays,
      };
    });

    const firstRate = quotesWithMarkup[0];

    const firstItemDims = extractItemDimensions(items[0]);
    const { data: quoteRecord } = await supabase
      .from('freight_quotes')
      .insert({
        customer_id: authContext.customerId,
        service_type: firstRate.serviceType,
        base_cost: firstRate.baseCost,
        markup_amount: firstRate.markupAmount,
        total_cost: firstRate.totalCost,
        origin_suburb: shipper.address.city,
        origin_postcode: shipper.address.postCode,
        destination_suburb: consignee.address.city,
        destination_postcode: consignee.address.postCode,
        weight: typeof firstItemDims.weight === 'number' ? firstItemDims.weight : parseFloat(String(firstItemDims.weight)),
        dimensions: { 
          length: typeof firstItemDims.length === 'number' ? firstItemDims.length : parseFloat(String(firstItemDims.length)), 
          width: typeof firstItemDims.width === 'number' ? firstItemDims.width : parseFloat(String(firstItemDims.width)), 
          height: typeof firstItemDims.height === 'number' ? firstItemDims.height : parseFloat(String(firstItemDims.height))
        },
        carrier_response: quoteResult.rawResponse,
      })
      .select()
      .single();

    const responseData = {
      quoteId: quoteRecord.id,
      rates: quotesWithMarkup,
      validUntil: quoteRecord.valid_until,
    };

    await supabase.from('api_request_logs').insert({
      customer_id: authContext.customerId,
      log_type: 'quote',
      endpoint: '/api-quote',
      request_data: body,
      response_data: responseData,
      status_code: 200,
      duration_ms: Date.now() - startTime,
    });

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Quote API error:', error);

    await supabase.from('api_request_logs').insert({
      log_type: 'quote',
      endpoint: '/api-quote',
      status_code: 500,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      duration_ms: Date.now() - startTime,
    });

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
