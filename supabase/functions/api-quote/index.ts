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
    const { shipper, consignee, items } = body;

    if (!shipper || !consignee || !items || !Array.isArray(items) || items.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: {
            shipper: { address: { line1: 'string', city: 'string', state: 'string', postCode: 'string', countryCode: 'string (optional, defaults to AU)' }, contact: { name: 'string', phone: 'string', email: 'string' } },
            consignee: { address: { line1: 'string', city: 'string', state: 'string', postCode: 'string', countryCode: 'string (optional, defaults to AU)' }, contact: { name: 'string', phone: 'string', email: 'string' } },
            items: [{ weight: 'number', length: 'number', width: 'number', height: 'number', quantity: 'number (optional)', description: 'string (optional)' }]
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate shipper address and contact
    if (!shipper.address || !shipper.contact) {
      return new Response(
        JSON.stringify({ error: 'Missing required shipper fields', required: ['address', 'contact'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!shipper.address.line1 || !shipper.address.city || !shipper.address.state || !shipper.address.postCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required shipper address fields', required: ['line1', 'city', 'state', 'postCode'] }),
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

    if (!consignee.address.line1 || !consignee.address.city || !consignee.address.state || !consignee.address.postCode) {
      return new Response(
        JSON.stringify({ error: 'Missing required consignee address fields', required: ['line1', 'city', 'state', 'postCode'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!consignee.contact.name || !consignee.contact.phone || !consignee.contact.email) {
      return new Response(
        JSON.stringify({ error: 'Missing required consignee contact fields', required: ['name', 'phone', 'email'] }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Helper function to extract item dimensions
    const extractItemDimensions = (item: any) => ({
      weight: item.weight?.value || item.weight,
      length: item.dimensions?.length || item.length,
      width: item.dimensions?.width || item.width,
      height: item.dimensions?.height || item.height,
    });

    // Validate items have all required dimensions
    for (const item of items) {
      const { weight, length, width, height } = extractItemDimensions(item);
      if (!weight || !length || !width || !height) {
        return new Response(
          JSON.stringify({ error: 'Missing required item fields', required: ['weight (or weight.value)', 'length (or dimensions.length)', 'width (or dimensions.width)', 'height (or dimensions.height)'] }),
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
          weight: parseFloat(dims.weight as any),
          length: parseFloat(dims.length as any),
          width: parseFloat(dims.width as any),
          height: parseFloat(dims.height as any),
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
        weight: parseFloat(firstItemDims.weight?.value ?? firstItemDims.weight),
        dimensions: { 
          length: firstItemDims.length, 
          width: firstItemDims.width, 
          height: firstItemDims.height 
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
