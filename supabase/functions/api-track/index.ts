import { createClient } from 'npm:@supabase/supabase-js@2';
import { AramexConnectClient } from '../_shared/aramex-connect-client.ts';
import { AuthService } from '../_shared/auth.ts';
import { RateLimiter } from '../_shared/rate-limit.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const shipmentId = pathParts[pathParts.length - 1];

    if (!shipmentId || shipmentId === 'api-track') {
      return new Response(
        JSON.stringify({
          error: 'Missing shipment ID',
          message: 'Please provide a shipment ID or consignment number in the URL path',
          example: '/api-track/{shipmentId}',
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aramexClient = new AramexConnectClient();
    const trackingResult = await aramexClient.trackShipment(shipmentId);

    if (!trackingResult.success) {
      await supabase.from('api_request_logs').insert({
        customer_id: authContext.customerId,
        log_type: 'track',
        endpoint: '/api-track',
        request_data: { shipmentId },
        response_data: trackingResult,
        status_code: 400,
        error_message: trackingResult.error,
        duration_ms: Date.now() - startTime,
      });

      return new Response(
        JSON.stringify({
          error: 'Failed to track shipment',
          details: trackingResult.error,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const responseData = {
      shipmentId: trackingResult.shipmentId,
      status: trackingResult.status,
      events: trackingResult.events,
    };

    await supabase.from('api_request_logs').insert({
      customer_id: authContext.customerId,
      log_type: 'track',
      endpoint: '/api-track',
      request_data: { shipmentId },
      response_data: responseData,
      status_code: 200,
      duration_ms: Date.now() - startTime,
    });

    return new Response(JSON.stringify(responseData), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Track API error:', error);

    await supabase.from('api_request_logs').insert({
      log_type: 'track',
      endpoint: '/api-track',
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
