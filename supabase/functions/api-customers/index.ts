import { createClient } from 'npm:@supabase/supabase-js@2';
import { AuthService } from '../_shared/auth.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

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

    if (req.method === 'GET') {
      const { data: customers, error } = await supabase
        .from('api_customers')
        .select('id, business_name, email, phone, markup_type, markup_value, is_active, created_at')
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch customers: ${error.message}`);
      }

      await supabase.from('api_request_logs').insert({
        customer_id: authContext.customerId,
        log_type: 'customers_list',
        endpoint: '/api-customers',
        response_data: { count: customers.length },
        status_code: 200,
        duration_ms: Date.now() - startTime,
      });

      return new Response(JSON.stringify({ customers }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'POST') {
      const body = await req.json();
      const { businessName, email, phone, markupType, markupValue } = body;

      if (!businessName || !email || !markupType || markupValue === undefined) {
        return new Response(
          JSON.stringify({
            error: 'Missing required fields',
            required: ['businessName', 'email', 'markupType', 'markupValue'],
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (markupType !== 'percentage' && markupType !== 'fixed') {
        return new Response(
          JSON.stringify({
            error: 'Invalid markupType',
            message: 'markupType must be either "percentage" or "fixed"',
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: existingCustomer } = await supabase
        .from('api_customers')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (existingCustomer) {
        return new Response(
          JSON.stringify({
            error: 'Customer already exists',
            message: 'A customer with this email already exists',
          }),
          { status: 409, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: newCustomer, error: customerError } = await supabase
        .from('api_customers')
        .insert({
          business_name: businessName,
          email,
          phone: phone || null,
          markup_type: markupType,
          markup_value: parseFloat(markupValue),
          is_active: true,
        })
        .select()
        .single();

      if (customerError) {
        throw new Error(`Failed to create customer: ${customerError.message}`);
      }

      const apiKey = authService.generateApiKey();
      const keyHash = authService.hashApiKey(apiKey);
      const keyPrefix = apiKey.substring(0, 8);

      const { error: keyError } = await supabase.from('customer_api_keys').insert({
        customer_id: newCustomer.id,
        key_hash: keyHash,
        key_prefix: keyPrefix,
        name: 'Primary API Key',
        is_active: true,
      });

      if (keyError) {
        throw new Error(`Failed to create API key: ${keyError.message}`);
      }

      const responseData = {
        customerId: newCustomer.id,
        businessName: newCustomer.business_name,
        email: newCustomer.email,
        phone: newCustomer.phone,
        markupType: newCustomer.markup_type,
        markupValue: newCustomer.markup_value,
        apiKey,
        message: 'Customer created successfully. Save the API key securely - it will not be shown again.',
      };

      await supabase.from('api_request_logs').insert({
        customer_id: authContext.customerId,
        log_type: 'customers_create',
        endpoint: '/api-customers',
        request_data: body,
        response_data: { customerId: newCustomer.id },
        status_code: 201,
        duration_ms: Date.now() - startTime,
      });

      return new Response(JSON.stringify(responseData), {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Customers API error:', error);

    await supabase.from('api_request_logs').insert({
      log_type: 'customers',
      endpoint: '/api-customers',
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