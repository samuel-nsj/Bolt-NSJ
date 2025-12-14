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

// Helper function to validate address and contact fields
function validatePartyFields(party: any, partyType: 'shipper' | 'consignee'): { valid: boolean; error?: string; missing?: string[]; message?: string } {
  // Validate address fields
  const missingAddressFields: string[] = [];
  if (!party.address.line1) missingAddressFields.push('address.line1');
  if (!party.address.city) missingAddressFields.push('address.city');
  if (!party.address.state) missingAddressFields.push('address.state');
  if (!party.address.postCode) missingAddressFields.push('address.postCode');
  
  if (missingAddressFields.length > 0) {
    return {
      valid: false,
      error: `Missing required ${partyType} address fields`,
      missing: missingAddressFields,
      message: `Please provide: ${missingAddressFields.join(', ')}`
    };
  }

  // Validate contact fields
  const missingContactFields: string[] = [];
  if (!party.contact.name) missingContactFields.push('contact.name');
  if (!party.contact.phone) missingContactFields.push('contact.phone');
  if (!party.contact.email) missingContactFields.push('contact.email');
  
  if (missingContactFields.length > 0) {
    return {
      valid: false,
      error: `Missing required ${partyType} contact fields`,
      missing: missingContactFields,
      message: `Please provide: ${missingContactFields.join(', ')}`
    };
  }

  return { valid: true };
}

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
            shipper: { address: { line1: 'string', city: 'string', state: 'string', postCode: 'string', countryCode: 'string' }, contact: { name: 'string', phone: 'string', email: 'string' } },
            consignee: { address: { line1: 'string', city: 'string', state: 'string', postCode: 'string', countryCode: 'string' }, contact: { name: 'string', phone: 'string', email: 'string' } },
            items: [{ weight: { value: 'number', unit: 'string' }, dimensions: { length: 'number', width: 'number', height: 'number', unit: 'string' }, quantity: 'number (optional)', description: 'string (optional)' }]
          }
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize shipper to nested structure (support both flat and nested formats)
    const normalizedShipper = shipper.address && shipper.contact ? {
      address: {
        ...shipper.address,
        countryCode: shipper.address.countryCode || 'AU'
      },
      contact: shipper.contact
    } : {
      address: {
        line1: shipper.address || '',
        city: shipper.city || '',
        state: shipper.state || '',
        postCode: shipper.postcode || shipper.postCode || '',
        countryCode: shipper.countryCode || 'AU'
      },
      contact: {
        name: shipper.name || '',
        phone: shipper.phone || '',
        email: shipper.email || ''
      }
    };

    // Normalize consignee to nested structure (support both flat and nested formats)
    const normalizedConsignee = consignee.address && consignee.contact ? {
      address: {
        ...consignee.address,
        countryCode: consignee.address.countryCode || 'AU'
      },
      contact: consignee.contact
    } : {
      address: {
        line1: consignee.address || '',
        city: consignee.city || '',
        state: consignee.state || '',
        postCode: consignee.postcode || consignee.postCode || '',
        countryCode: consignee.countryCode || 'AU'
      },
      contact: {
        name: consignee.name || '',
        phone: consignee.phone || '',
        email: consignee.email || ''
      }
    };

    // Use normalized structures
    shipper = normalizedShipper;
    consignee = normalizedConsignee;

    // Validate shipper fields
    const shipperValidation = validatePartyFields(shipper, 'shipper');
    if (!shipperValidation.valid) {
      return new Response(
        JSON.stringify({ 
          error: shipperValidation.error,
          missing: shipperValidation.missing,
          message: shipperValidation.message
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate consignee fields
    const consigneeValidation = validatePartyFields(consignee, 'consignee');
    if (!consigneeValidation.valid) {
      return new Response(
        JSON.stringify({ 
          error: consigneeValidation.error,
          missing: consigneeValidation.missing,
          message: consigneeValidation.message
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate items (support both nested and flat formats)
    for (const item of items) {
      const weight = item.weight?.value || item.weight;
      const length = item.dimensions?.length || item.length;
      const width = item.dimensions?.width || item.width;
      const height = item.dimensions?.height || item.height;
      
      if (!weight || !length || !width || !height) {
        return new Response(
          JSON.stringify({ error: 'Missing required item fields', required: ['weight', 'length', 'width', 'height'] }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

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
        countryCode: shipper.address.countryCode || 'AU',
      },
      consignee: {
        name: consignee.contact.name,
        address: consignee.address.line1,
        city: consignee.address.city,
        state: consignee.address.state,
        postcode: consignee.address.postCode,
        phone: consignee.contact.phone,
        email: consignee.contact.email,
        countryCode: consignee.address.countryCode || 'AU',
      },
      items: items.map((item: any) => ({
        weight: parseFloat(item.weight?.value || item.weight),
        length: parseFloat(item.dimensions?.length || item.length),
        width: parseFloat(item.dimensions?.width || item.width),
        height: parseFloat(item.dimensions?.height || item.height),
        quantity: item.quantity ? parseInt(item.quantity) : 1,
        description: item.description,
      })),
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
        weight: items[0].weight?.value || items[0].weight,
        dimensions: { 
          length: items[0].dimensions?.length || items[0].length, 
          width: items[0].dimensions?.width || items[0].width, 
          height: items[0].dimensions?.height || items[0].height 
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
