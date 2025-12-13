# Zones Setup Guide

This guide explains how to set up and use the zones (suburbs, postcodes, and regions) functionality in your application.

## Database Structure

The zones data is stored in a `zones` table with the following structure:

- `id` - Unique identifier
- `suburb` - Suburb name (e.g., "SYDNEY")
- `postcode` - Postal code (e.g., "2000")
- `commercial_category` - Commercial category code (e.g., "SYDNEY2000")
- `region` - Region code (e.g., "SYD", "MEL", "BRI")

## Initial Setup

### 1. Run the Database Migration

The migration files have been created and will set up the zones table:

```bash
# The migrations will be applied automatically when you deploy
# They create the zones table with proper indexes and security policies
```

### 2. Import Zones Data

There are multiple ways to import the zones data:

#### Option A: Using the Browser Console

1. Open your application in a browser
2. Open the browser console (F12)
3. Run:
```javascript
await window.importZones()
```

#### Option B: Using the Import Component

1. Add the ZonesImporter component to your admin dashboard
2. Click the "Import Zones" button

```tsx
import ZonesImporter from './components/ZonesImporter';

// In your admin page
<ZonesImporter />
```

#### Option C: Using the Edge Function

```bash
# Deploy the import-zones edge function
# Then call it with the zones data
```

## Using Zones in Your Application

### Search for Zones by Suburb

```tsx
import { searchZonesBySuburb } from './lib/zones';

const results = await searchZonesBySuburb('SYDNEY');
// Returns all zones matching "SYDNEY" (case-insensitive)
```

### Search by Postcode

```tsx
import { searchZonesByPostcode } from './lib/zones';

const results = await searchZonesByPostcode('2000');
// Returns all suburbs with postcode 2000
```

### Get Zones by Region

```tsx
import { getZonesByRegion } from './lib/zones';

const sydneyZones = await getZonesByRegion('SYD');
// Returns all zones in Sydney region
```

### Validate Suburb and Postcode

```tsx
import { validateSuburbPostcode } from './lib/zones';

const isValid = await validateSuburbPostcode('SYDNEY', '2000');
// Returns true if the combination exists
```

## Integration with Address Autocomplete

The zones data can be integrated with the existing AddressAutocomplete component:

```tsx
import { searchZonesBySuburb } from '../lib/zones';

// In your autocomplete component
const handleSearch = async (searchTerm: string) => {
  const zones = await searchZonesBySuburb(searchTerm);
  // Display zones as suggestions
  return zones.map(zone => ({
    suburb: zone.suburb,
    postcode: zone.postcode,
    region: zone.region
  }));
};
```

## Available Regions

The following regions are included in the dataset:

- **SYD** - Sydney
- **MEL** - Melbourne
- **BRI** - Brisbane
- **ADL** - Adelaide
- **PER** - Perth
- **CBR** - Canberra
- **GLD** - Gold Coast
- **NEW** - Newcastle
- **WOL** - Wollongong
- **TVL** - Townsville
- **CNS** - Cairns
- **LAU** - Launceston
- **TAS** - Tasmania
- **DPO** - Devonport
- And many more...

## Performance Considerations

The zones table includes the following indexes for optimal performance:

- Index on `suburb` for fast suburb searches
- Index on `postcode` for fast postcode lookups
- Index on `region` for filtering by region
- Composite index on `suburb` and `postcode` for exact matching

## Security

The zones table uses Row Level Security (RLS):

- Public read access is enabled (zones are reference data)
- Only authenticated users with proper permissions can modify zones
- The data is read-only for most users

## Troubleshooting

### Import Failed

If the import fails:

1. Check browser console for errors
2. Verify Supabase connection
3. Check that migrations have been applied
4. Ensure the CSV file is accessible

### Autocomplete Not Working

1. Verify zones have been imported
2. Check that the zones table exists in Supabase
3. Verify RLS policies allow reading
4. Check browser console for errors

### Performance Issues

If searches are slow:

1. Verify indexes are created
2. Consider limiting search results
3. Add debouncing to search inputs
4. Cache frequently accessed regions
