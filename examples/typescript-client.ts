export interface QuoteRequest {
  collectionSuburb: string;
  collectionPostcode: string;
  deliverySuburb: string;
  deliveryPostcode: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  serviceType?: string;
}

export interface QuoteResponse {
  quoteId: string;
  carrier: string;
  serviceType: string;
  baseCost: number;
  markupAmount: number;
  totalCost: number;
  currency: string;
  deliveryEstimate: number;
  validUntil: string;
}

export interface BookingRequest {
  quoteId: string;
  shipper: {
    name: string;
    address: string;
    suburb: string;
    postcode: string;
    country: string;
    phone: string;
    email: string;
  };
  consignee: {
    name: string;
    address: string;
    suburb: string;
    postcode: string;
    country: string;
    phone: string;
    email: string;
  };
  packages: Array<{
    weight: number;
    length: number;
    width: number;
    height: number;
    description?: string;
  }>;
  reference?: string;
}

export interface BookingResponse {
  bookingId: string;
  consignmentNumber: string;
  labelUrl: string;
  trackingUrl: string;
  status: string;
}

export interface TrackingResponse {
  consignmentNumber: string;
  status: string;
  events: Array<{
    timestamp: string;
    status: string;
    location: string;
    description: string;
  }>;
}

export class NSJExpressClient {
  private baseUrl: string;
  private apiKey: string;

  constructor(baseUrl: string, apiKey: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'API request failed');
    }

    return await response.json();
  }

  async getQuote(request: QuoteRequest): Promise<QuoteResponse> {
    return this.request<QuoteResponse>('/functions/v1/api-quote', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async createBooking(request: BookingRequest): Promise<BookingResponse> {
    return this.request<BookingResponse>('/functions/v1/api-book', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async trackShipment(consignmentNumber: string): Promise<TrackingResponse> {
    return this.request<TrackingResponse>(`/functions/v1/api-track/${consignmentNumber}`, {
      method: 'GET',
    });
  }
}

async function example() {
  const client = new NSJExpressClient(
    'https://your-project.supabase.co',
    'nsjx_your_api_key'
  );

  const quote = await client.getQuote({
    collectionSuburb: 'Sydney',
    collectionPostcode: '2000',
    deliverySuburb: 'Melbourne',
    deliveryPostcode: '3000',
    weight: 5,
    length: 40,
    width: 30,
    height: 20,
  });

  console.log('Quote received:', quote);
  console.log(`Total cost: $${quote.totalCost} ${quote.currency}`);

  const booking = await client.createBooking({
    quoteId: quote.quoteId,
    shipper: {
      name: 'John Smith',
      address: '123 Business St',
      suburb: 'Sydney',
      postcode: '2000',
      country: 'AU',
      phone: '+61400000000',
      email: 'john@example.com',
    },
    consignee: {
      name: 'Jane Doe',
      address: '456 Customer Ave',
      suburb: 'Melbourne',
      postcode: '3000',
      country: 'AU',
      phone: '+61411111111',
      email: 'jane@example.com',
    },
    packages: [
      {
        weight: 5,
        length: 40,
        width: 30,
        height: 20,
        description: 'Electronics',
      },
    ],
    reference: 'ORDER-12345',
  });

  console.log('Booking created:', booking);
  console.log(`Consignment number: ${booking.consignmentNumber}`);
  console.log(`Label URL: ${booking.labelUrl}`);

  const tracking = await client.trackShipment(booking.consignmentNumber);
  console.log('Tracking info:', tracking);
  console.log(`Current status: ${tracking.status}`);
}
