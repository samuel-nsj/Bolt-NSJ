import { createClient } from 'npm:@supabase/supabase-js@2';

export interface LogData {
  logType: string;
  customerId?: string;
  requestData?: any;
  responseData?: any;
  statusCode: number;
  errorMessage?: string;
  durationMs?: number;
  ipAddress?: string;
  endpoint?: string;
}

export class APILogger {
  private supabase;

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  async log(data: LogData): Promise<void> {
    try {
      await this.supabase
        .from('api_request_logs')
        .insert({
          log_type: data.logType,
          customer_id: data.customerId,
          request_data: data.requestData,
          response_data: data.responseData,
          status_code: data.statusCode,
          error_message: data.errorMessage,
          duration_ms: data.durationMs,
          ip_address: data.ipAddress,
          endpoint: data.endpoint,
        });
    } catch (error) {
      console.error('Failed to log API request:', error);
    }
  }
}
