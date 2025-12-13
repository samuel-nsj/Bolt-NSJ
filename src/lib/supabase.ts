import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserProfile = {
  id: string;
  full_name?: string;
  phone?: string;
  company_name?: string;
  default_pickup_address?: string;
  default_delivery_address?: string;
  created_at: string;
  updated_at: string;
};

export type PaymentMethod = {
  id: string;
  user_id: string;
  card_brand: string;
  last_four: string;
  expiry_month: string;
  expiry_year: string;
  cardholder_name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
};

export type Booking = {
  id: string;
  user_id: string;
  pickup_address: string;
  delivery_address: string;
  package_weight: number;
  package_length: number;
  package_width: number;
  package_height: number;
  courier_preference?: string;
  delivery_speed?: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  status: string;
  created_at: string;
  updated_at: string;
  quantity: number;
  estimated_price: number;
  payment_status?: string;
  payment_method?: string;
  payment_amount?: number;
  paid_at?: string;
  xero_invoice_id?: string;
  xero_invoice_number?: string;
  reference?: string;
  shipping_method?: string;
  shipping_description?: string;
  currency?: string;
  destination_name?: string;
  destination_company?: string;
  destination_building?: string;
  destination_street?: string;
  destination_suburb?: string;
  destination_city?: string;
  destination_state?: string;
  destination_postcode?: string;
  destination_country?: string;
  destination_email?: string;
  destination_phone?: string;
  delivery_instructions?: string;
  pickup_country?: string;
  sku?: string;
  item_description?: string;
  item_value?: number;
  tariff_code?: string;
  country_of_origin?: string;
  tracking_number?: string;
  label_url?: string;
  service_type?: string;
};

export type SavedLocation = {
  id: string;
  user_id: string;
  name: string;
  contact_name: string;
  company_name?: string;
  phone: string;
  email: string;
  address_line1: string;
  address_line2?: string;
  suburb: string;
  postcode: string;
  state?: string;
  instructions?: string;
  is_pickup: boolean;
  is_delivery: boolean;
  is_business: boolean;
  created_at: string;
  updated_at: string;
};

export type SavedItem = {
  id: string;
  user_id: string;
  name: string;
  type: string;
  weight: number;
  length: number;
  width: number;
  height: number;
  description?: string;
  created_at: string;
  updated_at: string;
};

export type SavedQuote = {
  id: string;
  user_id: string;
  pickup_postcode: string;
  pickup_suburb?: string;
  pickup_state?: string;
  pickup_is_business: boolean;
  delivery_postcode: string;
  delivery_suburb?: string;
  delivery_state?: string;
  delivery_is_business: boolean;
  service_type: string;
  items: any;
  estimated_price: number;
  estimated_eta?: number;
  quote_name?: string;
  created_at: string;
  updated_at: string;
};
