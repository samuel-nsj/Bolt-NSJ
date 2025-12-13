/**
 * AramexConnect AU 2025 API Client
 *
 * Identity Server: https://identity.aramexconnect.com.au
 * API Base:      https://api.aramexconnect.com.au
 *
 * OAuth2 Endpoint: POST /connect/token (scope: ac-api-au)
 * Shipping Endpoints:
 * - POST /shipping/v1/rates
 * - POST /shipping/v1/shipments
 * - GET  /shipping/v1/shipments/{shipmentId}/tracking
 */

interface OAuth2Token {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
}

interface OAuth2Error {
  error: string;
  error_description?: string;
}

interface AramexConfig {
  identityUrl: string;      // e.g., https://identity.aramexconnect.com.au
  baseUrl: string;          // e.g., https://api.aramexconnect.com.au
  clientId: string;
  clientSecret: string;
  accountNumber: string;
  countryCode: string;
}

export interface QuoteRequest {
  shipper: {
    name: string;
    address: string;
    city: string;
    postcode: string;
    phone: string;
    email: string;
    countryCode?: string;
  };
  consignee: {
    name: string;
    address: string;
    city: string;
    postcode: string;
    phone: string;
    email: string;
    countryCode?: string;
  };
  items: Array<{
    weight: number;
    length: number;
    width: number;
    height: number;
    quantity?: number;
    description?: string;
  }>;
}

export interface BookingRequest {
  reference: string;
  shipper: {
    name: string;
    address: string;
    city: string;
    postcode: string;
    phone: string;
    email: string;
    countryCode?: string;
  };
  consignee: {
    name: string;
    address: string;
    city: string;
    postcode: string;
    phone: string;
    email: string;
    countryCode?: string;
  };
  items: Array<{
    weight: number;
    length: number;
    width: number;
    height: number;
    quantity?: number;
    description?: string;
  }>;
  serviceType: string;
}

export interface QuoteResponse {
  success: boolean;
  rates?: Array<{
    serviceType: string;
    serviceName: string;
    baseAmount: number;
    totalAmount: number;
    currency: string;
    transitDays: number;
  }>;
  error?: string;
  errorDescription?: string;
  rawResponse?: any;
}

export interface BookingResponse {
  success: boolean;
  shipmentId?: string;
  consignmentNumber?: string;
  labelUrl?: string;
  trackingUrl?: string;
  error?: string;
  errorDescription?: string;
  rawResponse?: any;
}

export interface TrackingResponse {
  success: boolean;
  shipmentId?: string;
  status?: string;
  events?: Array<{
    timestamp: string;
    status: string;
    location: string;
    description: string;
  }>;
  error?: string;
  errorDescription?: string;
  rawResponse?: any;
}

export class AramexConnectClient {
  private config: AramexConfig;
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor() {
    this.config = {
      identityUrl: (Deno.env.get('ARAMEX_IDENTITY_URL') || 'https://identity.aramexconnect.com.au').replace(/\/+$/, ''),
      baseUrl: (Deno.env.get('ARAMEX_BASE_URL') || 'https://api.aramexconnect.com.au').replace(/\/+$/, ''),
      clientId: Deno.env.get('ARAMEX_CLIENT_ID') || '',
      clientSecret: Deno.env.get('ARAMEX_CLIENT_SECRET') || '',
      accountNumber: Deno.env.get('ARAMEX_ACCOUNT_NUMBER') || '',
      countryCode: Deno.env.get('ARAMEX_ACCOUNT_COUNTRY') || 'AU',
    };

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('AramexConnect credentials not configured');
    }
  }

  /**
   * Get OAuth2 access token (scope: ac-api-au)
   */
  private async getAccessToken(): Promise<string> {
    const now = Date.now();
    if (this.accessToken && now < this.tokenExpiry) {
      return this.accessToken;
    }

    const tokenUrl = `${this.config.identityUrl}/connect/token`;
    const params = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: 'ac-api-au',
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!response.ok) {
      const errorData: OAuth2Error = await response.json().catch(async () => ({
        error: 'unknown_error',
        error_description: await response.text(),
      }));
      throw new Error(
        `OAuth2 token request failed: ${errorData.error} - ${errorData.error_description || 'No description'}`
      );
    }

    const data: OAuth2Token = await response.json();
    this.accessToken = data.access_token;
    const expiresIn = data.expires_in || 3600;
    this.tokenExpiry = now + expiresIn * 1000 - 60_000; // refresh 60s early
    return this.accessToken;
  }

  /**
   * Authenticated request helper
   */
  private async makeAuthenticatedRequest(method: string, endpoint: string, body?: any): Promise<any> {
    const token = await this.getAccessToken();
    const url = `${this.config.baseUrl}${endpoint}`;

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    };
    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const text = await response.text();

    if (!response.ok) {
      try {
        const errJson = text ? JSON.parse(text) : {};
        throw new Error(
          `AramexConnect API error: ${errJson.error || errJson.message || response.statusText} (${response.status})`
        );
      } catch {
        throw new Error(`AramexConnect API error: ${response.status} - ${text}`);
      }
    }

    return text ? JSON.parse(text) : {};
  }

  /**
   * Get shipping rates (quotes)
   * POST /shipping/v1/rates
   */
  async getRates(request: QuoteRequest): Promise<QuoteResponse> {
    try {
      const payload = {
        shipper: {
          address: {
            line1: request.shipper.address,
            city: request.shipper.city,
            postCode: request.shipper.postcode,
            countryCode: request.shipper.countryCode || this.config.countryCode,
          },
          contact: {
            name: request.shipper.name,
            phone: request.shipper.phone,
            email: request.shipper.email,
          },
        },
        consignee: {
          address: {
            line1: request.consignee.address,
            city: request.consignee.city,
            postCode: request.consignee.postcode,
            countryCode: request.consignee.countryCode || this.config.countryCode,
          },
          contact: {
            name: request.consignee.name,
            phone: request.consignee.phone,
            email: request.consignee.email,
          },
        },
        items: request.items.map((item) => ({
          weight: { value: item.weight, unit: 'Kg' },
          dimensions: { length: item.length, width: item.width, height: item.height, unit: 'Cm' },
          quantity: item.quantity || 1,
          description: item.description || 'General Goods',
        })),
        isDocument: false,
        declaredValue: 0,
      };

      const data = await this.makeAuthenticatedRequest('POST', '/shipping/v1/rates', payload);

      if (!data.rates || data.rates.length === 0) {
        const errorMsg = data.error?.message || data.message || 'No rates available';
        return { success: false, error: errorMsg, rawResponse: data };
      }

      const rates = data.rates.map((rate: any) => ({
        serviceType: rate.serviceType || rate.productCode,
        serviceName: rate.serviceName || rate.productName || 'Standard Service',
        baseAmount: parseFloat(rate.baseAmount?.value ?? rate.baseCharge?.value ?? rate.amount ?? 0),
        totalAmount: parseFloat(rate.totalAmount?.value ?? rate.totalCost?.value ?? rate.total ?? 0),
        currency: rate.totalAmount?.currency ?? rate.currency ?? 'AUD',
        transitDays: parseInt(rate.transitDays ?? rate.deliveryTime ?? '3', 10),
      }));

      return { success: true, rates, rawResponse: data };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Create shipment (booking)
   * POST /shipping/v1/shipments
   */
  async createShipment(request: BookingRequest): Promise<BookingResponse> {
    try {
      const payload = {
        shipments: [
          {
            reference: request.reference,
            shipper: {
              address: {
                line1: request.shipper.address,
                city: request.shipper.city,
                postCode: request.shipper.postcode,
                countryCode: request.shipper.countryCode || this.config.countryCode,
              },
              contact: {
                name: request.shipper.name,
                phone: request.shipper.phone,
                email: request.shipper.email,
              },
            },
            consignee: {
              address: {
                line1: request.consignee.address,
                city: request.consignee.city,
                postCode: request.consignee.postcode,
                countryCode: request.consignee.countryCode || this.config.countryCode,
              },
              contact: {
                name: request.consignee.name,
                phone: request.consignee.phone,
                email: request.consignee.email,
              },
            },
            items: request.items.map((item) => ({
              weight: { value: item.weight, unit: 'Kg' },
              dimensions: { length: item.length, width: item.width, height: item.height, unit: 'Cm' },
              quantity: item.quantity || 1,
              description: item.description || 'General Goods',
            })),
            serviceType: request.serviceType,
            paymentType: 'P',
            payerAccountNumber: this.config.accountNumber || this.config.clientId,
            labelFormat: { format: 'PDF', type: 'URL' },
          },
        ],
      };

      const data = await this.makeAuthenticatedRequest('POST', '/shipping/v1/shipments', payload);

      if (!data.shipments || data.shipments.length === 0) {
        const errorMsg = data.error?.message || data.message || 'Shipment creation failed';
        return { success: false, error: errorMsg, rawResponse: data };
      }

      const shipment = data.shipments[0];
      const shipmentId = shipment.shipmentId || shipment.id;
      const consignmentNumber = shipment.consignmentNumber || shipment.trackingNumber || shipmentId;
      const labelUrl = shipment.labelUrl || shipment.label?.url;

      if (!shipmentId) {
        return { success: false, error: 'No shipment ID returned', rawResponse: data };
      }

      return {
        success: true,
        shipmentId,
        consignmentNumber,
        labelUrl,
        trackingUrl: consignmentNumber
          ? `https://www.aramex.com/au/track/shipment/${consignmentNumber}`
          : undefined,
        rawResponse: data,
      };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Track shipment
   * GET /shipping/v1/shipments/{shipmentId}/tracking
   */
  async trackShipment(shipmentId: string): Promise<TrackingResponse> {
    try {
      const data = await this.makeAuthenticatedRequest(
        'GET',
        `/shipping/v1/shipments/${shipmentId}/tracking`
      );

      if (data.error) {
        const errorMsg = data.error.message || data.message || 'Tracking failed';
        return { success: false, shipmentId, error: errorMsg, rawResponse: data };
      }

      const tracking = data.tracking || data;
      const events = (tracking.events || []).map((event: any) => ({
        timestamp: event.timestamp || event.dateTime || event.date,
        status: event.status || event.code || event.statusCode,
        location: event.location || event.locationName || '',
        description: event.description || event.comments || event.message || '',
      }));

      return {
        success: true,
        shipmentId,
        status: tracking.status || tracking.currentStatus || 'Unknown',
        events,
        rawResponse: data,
      };
    } catch (error) {
      return { success: false, shipmentId, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}