# NSJ Express - Freight Booking Platform

A professional freight booking website with Supabase authentication and Zapier integration for Starshipit and Xero.

## Features

- **User Authentication**: Sign up and login with Supabase
- **Dashboard**: View and manage all bookings
- **Booking Form**: Complete freight booking with:
  - Pickup and delivery addresses
  - Package details (weight, dimensions)
  - Courier preference and delivery speed
  - Customer contact information
- **Integrations**:
  - Supabase for authentication and database
  - Zapier webhook for automation
  - Starshipit for shipping automation
  - Xero for automatic invoicing

## Setup Instructions

### 1. Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_ZAPIER_WEBHOOK_URL=your_zapier_webhook_url
```

### 2. Supabase Configuration

The database table `bookings` has already been created with the following schema:
- User authentication linked to bookings
- Row Level Security (RLS) enabled
- Users can only view and manage their own bookings

### 3. Zapier Setup

1. Create a Zapier webhook that receives booking data
2. Configure the webhook to send data to:
   - **Starshipit**: Create shipment with pickup/delivery info
   - **Xero**: Create invoice for the booking
3. Copy the webhook URL to your `.env` file

### 4. Install Dependencies

```bash
npm install
```

### 5. Run Development Server

```bash
npm run dev
```

### 6. Build for Production

```bash
npm run build
```

The production files will be in the `dist` folder, ready to upload to your hosting platform.

## User Flow

1. User signs up or logs in
2. Redirected to dashboard
3. Click "New Booking" to create a booking
4. Fill out the booking form
5. Submit - shows "Creating booking..." with loading animation
6. Success - "Booking Created!" message
7. Redirected back to dashboard
8. Booking data sent to Zapier → Starshipit + Xero

## Styling

The design uses a purple NSJ Express theme with:
- Professional gradient backgrounds
- Modern card-based layouts
- Smooth transitions and hover effects
- Responsive design for all screen sizes
- Lucide React icons throughout

## Technology Stack

- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Authentication**: Supabase Auth
- **Database**: Supabase PostgreSQL
- **Icons**: Lucide React
- **Integrations**: Zapier webhooks
