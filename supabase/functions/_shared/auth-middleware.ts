import { createClient } from 'npm:@supabase/supabase-js@2';

export interface AuthContext {
  customerId: string;
  isAuthenticated: boolean;
  apiKey?: string;
}

export class AuthMiddleware {
  private supabase;

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async authenticateApiKey(apiKeyHeader: string): Promise<AuthContext | null> {
    if (!apiKeyHeader || !apiKeyHeader.startsWith('Bearer ')) {
      return null;
    }

    const apiKey = apiKeyHeader.replace('Bearer ', '').trim();

    const { data: keyData, error } = await this.supabase
      .from('customer_api_keys')
      .select('*, api_customers!inner(*)')
      .eq('key_hash', this.hashApiKey(apiKey))
      .eq('is_active', true)
      .maybeSingle();

    if (error || !keyData) {
      return null;
    }

    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      return null;
    }

    await this.supabase
      .from('customer_api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id);

    return {
      customerId: keyData.customer_id,
      isAuthenticated: true,
      apiKey,
    };
  }

  async authenticateJWT(authHeader: string): Promise<AuthContext | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.replace('Bearer ', '').trim();

    const { data: { user }, error } = await this.supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    const { data: customer } = await this.supabase
      .from('api_customers')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!customer) {
      return null;
    }

    return {
      customerId: customer.id,
      isAuthenticated: true,
    };
  }

  hashApiKey(apiKey: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    return Array.from(data)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  generateApiKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return 'nsjx_' + Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
