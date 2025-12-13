import { supabase } from './supabase';

export interface Zone {
  KEY: string;
  SUBURB: string;
  POSTCODE: number;
  STATE: string;
  ZONE: string;
}

/**
 * Search for zones by suburb name with smart prioritization
 */
export async function searchZonesBySuburb(searchTerm: string): Promise<Zone[]> {
  const { data, error } = await supabase
    .from('Zones')
    .select('*')
    .ilike('SUBURB', `%${searchTerm}%`)
    .limit(100);

  if (error) {
    console.error('Error searching zones:', error);
    return [];
  }

  if (!data) return [];

  const normalizedSearch = searchTerm.toUpperCase().trim();

  const sorted = data.sort((a, b) => {
    const aSuburb = a.SUBURB.toUpperCase();
    const bSuburb = b.SUBURB.toUpperCase();

    const aExactMatch = aSuburb === normalizedSearch;
    const bExactMatch = bSuburb === normalizedSearch;
    if (aExactMatch && !bExactMatch) return -1;
    if (!aExactMatch && bExactMatch) return 1;

    const aStartsWith = aSuburb.startsWith(normalizedSearch);
    const bStartsWith = bSuburb.startsWith(normalizedSearch);
    if (aStartsWith && !bStartsWith) return -1;
    if (!aStartsWith && bStartsWith) return 1;

    const aIndex = aSuburb.indexOf(normalizedSearch);
    const bIndex = bSuburb.indexOf(normalizedSearch);
    if (aIndex !== bIndex) return aIndex - bIndex;

    return aSuburb.localeCompare(bSuburb);
  });

  return sorted;
}

/**
 * Search for zones by postcode with smart matching
 */
export async function searchZonesByPostcode(postcode: string): Promise<Zone[]> {
  const searchValue = postcode.trim();

  if (!searchValue || searchValue.length === 0) return [];

  try {
    const numValue = parseInt(searchValue);

    if (isNaN(numValue)) return [];

    const minPostcode = numValue;
    const maxPostcode = searchValue.length === 4
      ? numValue
      : parseInt(searchValue + '9'.repeat(4 - searchValue.length));

    const { data, error } = await supabase
      .from('Zones')
      .select('*')
      .gte('POSTCODE', minPostcode)
      .lte('POSTCODE', maxPostcode)
      .limit(100);

    if (error) {
      console.error('Error searching zones by postcode:', error);
      return [];
    }

    if (!data || data.length === 0) return [];

    const filtered = data.filter(zone => {
      const postcodeStr = String(zone.POSTCODE);
      return postcodeStr.startsWith(searchValue);
    });

    const sorted = filtered.sort((a, b) => {
      const aPostcode = String(a.POSTCODE);
      const bPostcode = String(b.POSTCODE);

      const aExactMatch = aPostcode === searchValue;
      const bExactMatch = bPostcode === searchValue;
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;

      const aStartsWith = aPostcode.startsWith(searchValue);
      const bStartsWith = bPostcode.startsWith(searchValue);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;

      if (aPostcode !== bPostcode) return aPostcode.localeCompare(bPostcode);

      return a.SUBURB.localeCompare(b.SUBURB);
    });

    return sorted;
  } catch (error) {
    console.error('Error in searchZonesByPostcode:', error);
    return [];
  }
}

/**
 * Get zones by zone name
 */
export async function getZonesByZone(zone: string): Promise<Zone[]> {
  const { data, error } = await supabase
    .from('Zones')
    .select('*')
    .eq('ZONE', zone)
    .order('SUBURB');

  if (error) {
    console.error('Error getting zones by zone:', error);
    return [];
  }

  return data || [];
}

/**
 * Get zones by state
 */
export async function getZonesByState(state: string): Promise<Zone[]> {
  const { data, error } = await supabase
    .from('Zones')
    .select('*')
    .eq('STATE', state)
    .order('SUBURB');

  if (error) {
    console.error('Error getting zones by state:', error);
    return [];
  }

  return data || [];
}

/**
 * Get a specific zone by suburb and postcode
 */
export async function getZoneBySuburbAndPostcode(
  suburb: string,
  postcode: string
): Promise<Zone | null> {
  const { data, error } = await supabase
    .from('Zones')
    .select('*')
    .eq('SUBURB', suburb.toUpperCase())
    .eq('POSTCODE', parseInt(postcode))
    .maybeSingle();

  if (error) {
    console.error('Error getting zone:', error);
    return null;
  }

  return data;
}

/**
 * Get all unique zones
 */
export async function getAllZones(): Promise<string[]> {
  const { data, error } = await supabase
    .from('Zones')
    .select('ZONE')
    .order('ZONE');

  if (error) {
    console.error('Error getting zones:', error);
    return [];
  }

  const uniqueZones = [...new Set(data?.map(d => d.ZONE) || [])];
  return uniqueZones;
}

/**
 * Get all unique states
 */
export async function getAllStates(): Promise<string[]> {
  const { data, error } = await supabase
    .from('Zones')
    .select('STATE')
    .order('STATE');

  if (error) {
    console.error('Error getting states:', error);
    return [];
  }

  const uniqueStates = [...new Set(data?.map(d => d.STATE) || [])];
  return uniqueStates;
}

/**
 * Validate if a suburb and postcode combination exists
 */
export async function validateSuburbPostcode(
  suburb: string,
  postcode: string
): Promise<boolean> {
  const zone = await getZoneBySuburbAndPostcode(suburb, postcode);
  return zone !== null;
}

/**
 * Universal search for zones - searches by suburb or postcode automatically
 */
export async function searchZones(query: string): Promise<Zone[]> {
  if (!query || query.length < 2) return [];

  const isNumeric = /^\d+$/.test(query.trim());

  if (isNumeric) {
    return await searchZonesByPostcode(query);
  } else {
    return await searchZonesBySuburb(query);
  }
}
