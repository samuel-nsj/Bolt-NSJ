import { createClient } from 'npm:@supabase/supabase-js@2';
import { AramexConnectClient } from '../_shared/aramex-connect-client.ts';
import { AuthService } from '../_shared/auth.ts';
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
    let { quoteId, reference, shipper, consignee, items, serviceType } = body;

    if (!quoteId || !shipper || !consignee || !items || !Array.isArray(items) || items.length === 0 || !serviceType) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          required: {
            quoteId: 'string',
            reference: 'string (optional)',
            shipper: 'Nested: { address: { line1, city, state, postCode, countryCode? }, contact: { name, phone, email } } OR Flat: { name, address, city, state?, postcode, phone, email, countryCode? }',
            consignee: 'Nested: { address: { line1, city, state, postCode, countryCode? }, contact: { name, phone, email } } OR Flat: { name, address, city, state?, postcode, phone, email, countryCode? }',
            items: [{ weight: 'number', length: 'number', width: 'number', height: 'number', quantity: 'number (optional)', description: 'string (optional)' }],
            serviceType: 'string'
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

    const { data: quote } = await supabase
      .from('freight_quotes')
      .select('*')
      .eq('id', quoteId)
      .eq('customer_id', authContext.customerId)
      .maybeSingle();

    if (!quote) {
      return new Response(
        JSON.stringify({
          error: 'Quote not found or expired',
          message: 'Please ensure the quote ID is correct and belongs to your account',
        }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (new Date(quote.valid_until) < new Date()) {
      return new Response(
        JSON.stringify({
          error: 'Quote has expired',
          message: 'Please request a new quote',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aramexClient = new AramexConnectClient();

    // Default countryCode to AU if not provided
    const shipperCountryCode = shipper.address.countryCode || 'AU';
    const consigneeCountryCode = consignee.address.countryCode || 'AU';

    const bookingResult = await aramexClient.createShipment({
      reference: reference || `BK-${Date.now()}`,
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
      items: items.map((item: any) => ({
        weight: parseFloat(item.weight),
        length: parseFloat(item.length),
        width: parseFloat(item.width),
        height: parseFloat(item.height),
        quantity: item.quantity ? parseInt(item.quantity) : 1,
        description: item.description || 'General Goods',
      })),
      serviceType,
    });

    if (!bookingResult.success) {
      await supabase.from('api_request_logs').insert({
        customer_id: authContext.customerId,
        log_type: 'book',
        endpoint: '/api-book',
        request_data: body,
        response_data: bookingResult,
        status_code: 400,
        error_message: bookingResult.error,
        duration_ms: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify({
          error: 'Failed to create booking',
          details: bookingResult.error,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: booking } = await supabase
      .from('bookings')
      .insert({
        customer_id: authContext.customerId,
        quote_id: quoteId,
        consignment_number: bookingResult.consignmentNumber,
        label_url: bookingResult.labelUrl,
        tracking_url: bookingResult.trackingUrl,
        estimated_price: quote.total_cost,
        reference_number: reference || `BK-${Date.now()}`,
        pickup_name: shipper.contact.name,
        pickup_address: shipper.address.line1,
        pickup_suburb: shipper.address.city,
        pickup_postcode: shipper.address.postCode,
        pickup_phone: shipper.contact.phone,
        pickup_email: shipper.contact.email,
        delivery_name: consignee.contact.name,
        delivery_address: consignee.address.line1,
        delivery_suburb: consignee.address.city,
        delivery_postcode: consignee.address.postCode,
        delivery_phone: consignee.contact.phone,
        delivery_email: consignee.contact.email,
        package_weight: items[0].weight,
        package_length: items[0].length,
        package_width: items[0].width,
        package_height: items[0].height,
        package_description: items[0].description || 'General Goods',
        status: 'confirmed',
      })
      .select()
      .single();

    const responseData = {
      bookingId: booking.id,
      shipmentId: bookingResult.shipmentId,
      consignmentNumber: bookingResult.consignmentNumber,
      labelUrl: bookingResult.labelUrl,
      trackingUrl: bookingResult.trackingUrl,
      status: 'confirmed',
    };

    await supabase.from('api_request_logs').insert({
      customer_id: authContext.customerId,
      log_type: 'book',
      endpoint: '/api-book',
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
    console.error('Book API error:', error);

    await supabase.from('api_request_logs').insert({
      log_type: 'book',
      endpoint: '/api-book',
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
