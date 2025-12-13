/**
 * Authentication Module
 *
 * Supports both API Key and JWT authentication
 */

import { createClient, SupabaseClient } from 'npm:@supabase/supabase-js@2';

export interface AuthContext {
  customerId: string;
  isAuthenticated: boolean;
  apiKey?: string;
}

export class AuthService {
  private supabase: SupabaseClient;

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase configuration missing');
    }

    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Hash API key using simple hex encoding
   * (Matches the format used when generating keys)
   */
  hashApiKey(apiKey: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    return Array.from(data)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Generate a new API key
   */
  generateApiKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return (
      'nsjx_' +
      Array.from(array)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
    );
  }

  /**
   * Authenticate using API Key
   */
  async authenticateApiKey(authHeader: string): Promise<AuthContext | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const apiKey = authHeader.replace('Bearer ', '').trim();
    const keyHash = this.hashApiKey(apiKey);

    try {
      const { data: keyData, error } = await this.supabase
        .from('customer_api_keys')
        .select('*, api_customers!inner(*)')
        .eq('key_hash', keyHash)
        .eq('is_active', true)
        .maybeSingle();

      if (error || !keyData) {
        console.log('API key not found or inactive');
        return null;
      }

      if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
        console.log('API key expired');
        return null;
      }

      await this.supabase
        .from('customer_api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyData.id);

      console.log(`API key authenticated for customer: ${keyData.customer_id}`);

      return {
        customerId: keyData.customer_id,
        isAuthenticated: true,
        apiKey,
      };
    } catch (error) {
      console.error('API key authentication error:', error);
      return null;
    }
  }

  /**
   * Authenticate using JWT token
   */
  async authenticateJWT(authHeader: string): Promise<AuthContext | null> {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.replace('Bearer ', '').trim();

    try {
      const {
        data: { user },
        error,
      } = await this.supabase.auth.getUser(token);

      if (error || !user) {
        console.log('JWT authentication failed');
        return null;
      }

      const { data: customer } = await this.supabase
        .from('api_customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!customer) {
        console.log('No customer found for user');
        return null;
      }

      console.log(`JWT authenticated for customer: ${customer.id}`);

      return {
        customerId: customer.id,
        isAuthenticated: true,
      };
    } catch (error) {
      console.error('JWT authentication error:', error);
      return null;
    }
  }

  /**
   * Authenticate request (tries API Key first, then JWT)
   */
  async authenticate(authHeader: string | null): Promise<AuthContext | null> {
    if (!authHeader) {
      return null;
    }

    let authContext = await this.authenticateApiKey(authHeader);

    if (!authContext) {
      authContext = await this.authenticateJWT(authHeader);
    }

    return authContext;
  }
}
