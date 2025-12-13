// Pricing data from CSV - using exact rates without markup
// Max weight: 25kg

export const ZONE_CODES: { [key: string]: string } = {
  'adelaide': 'ADL',
  'shepparton': 'SHT',
  'geelong': 'GEE',
  'melbourne': 'MEL',
  'newcastle': 'NEW',
  'sydney': 'SYD',
  'wollongong': 'WOL',
  'albury': 'ALB',
  'bendigo': 'BEN',
  'brisbane': 'BRI',
  'canberra': 'CBR',
  'central coast': 'CCT',
  'coffs harbour': 'CFS',
  'orange': 'OAG',
  'dubbo': 'DPO',
  'gold coast': 'GLD',
  'launceston': 'LAU',
  'northern nsw': 'NTH',
  'perth': 'PER',
  'port macquarie': 'PQQ',
  'tasmania': 'TAS',
  'sunshine coast': 'SUN',
  'toowoomba': 'TOO',
  'bundaberg': 'BDB',
  'capricorn coast': 'CAP',
  'cairns': 'CNS',
  'mackay': 'MKY',
  'maryborough': 'MYB',
  'townsville': 'TVL',
  'devonport': 'DPO',
  'young': 'YNG',
};

// Rates structure: [0.5kg, 1kg, 2kg, 3kg, 4kg, 5kg, Base>5kg, PerKg]
export const RATES: { [key: string]: { [key: string]: number[] } } = {
  'ADL': {
    'ADL': [7.125, 7.125, 7.125, 7.125, 7.125, 7.125, 7.125, 0],
    'SYD': [8.65, 8.8875, 9.375, 9.8625, 10.35, 10.85, 11.3375, 0.4875],
    'MEL': [8.5375, 8.6625, 8.9125, 9.175, 9.4375, 9.6875, 9.95, 0.2625],
    'BRI': [8.85, 9.3, 10.1875, 11.0875, 11.9875, 12.875, 13.775, 0.9],
    'PER': [8.85, 9.3, 10.1875, 11.0875, 11.9875, 12.875, 13.775, 0.9],
  },
  'SYD': {
    'SYD': [5.7875, 6.475, 6.475, 6.475, 6.475, 6.475, 7.1625, 0.2],
    'MEL': [8.1875, 8.5875, 8.7375, 8.875, 9.075, 9.275, 10.0875, 0.95],
    'BRI': [8.1875, 8.875, 9.55, 10.225, 10.575, 10.9125, 11.6, 0.95],
    'ADL': [9.2, 9.3375, 9.475, 9.625, 9.9125, 10.225, 11.6625, 0.75],
    'PER': [9.8875, 10.025, 10.975, 10.975, 12.2, 14.2625, 15.2125, 1.475],
  },
  'MEL': {
    'MEL': [6.3625, 7.1125, 7.1125, 7.1125, 7.1125, 7.1125, 7.8625, 0.225],
    'SYD': [9.2, 9.425, 9.5875, 9.7375, 10.1, 10.85, 13.4875, 0.75],
    'BRI': [9.2, 9.7375, 10.4875, 11.225, 11.975, 12.725, 22.4625, 1.1125],
    'ADL': [9.2, 9.425, 9.5875, 9.7375, 10.1, 10.85, 13.4875, 0.725],
    'PER': [9.8875, 10.025, 10.5125, 10.975, 12.2, 12.95, 15.2125, 1.0375],
  },
  'BRI': {
    'BRI': [5.8, 6.475, 6.475, 6.475, 6.475, 6.475, 7.1625, 0.2],
    'SYD': [8.45, 8.5875, 8.725, 8.8625, 9.075, 9.275, 10.0875, 0.8375],
    'MEL': [8.45, 10.6375, 11.8625, 13.1625, 14.525, 16.3625, 17.725, 1.1125],
    'GLD': [7.6375, 7.775, 8.05, 8.05, 9.1625, 9.1625, 9.3125, 0.2875],
    'PER': [8.8, 12, 15.2125, 18.475, 21.825, 25.9125, 34.525, 4.85],
  },
  'PER': {
    'PER': [5.8625, 6.2125, 6.2125, 6.2125, 6.2125, 6.2125, 7.0625, 0.2],
    'SYD': [9.8875, 10.025, 10.975, 10.975, 12.2, 14.2625, 15.2125, 1.475],
    'MEL': [9.8875, 10.025, 10.5125, 10.975, 12.2, 12.95, 15.2125, 1.0375],
    'BRI': [11.725, 11.8625, 14.325, 14.325, 17.7375, 17.7375, 21.825, 2.35],
    'ADL': [8.8, 9.1, 9.9, 10.7125, 11.6625, 12.6, 25.1625, 1.775],
  },
};

export function getZoneCode(location: string): string | null {
  const normalized = location.toLowerCase().trim();
  return ZONE_CODES[normalized] || null;
}

export function calculateRate(fromZone: string, toZone: string, weight: number): number | null {
  // Max weight is 25kg
  if (weight > 25) {
    return null;
  }

  const routes = RATES[fromZone];
  if (!routes) return null;

  const rates = routes[toZone];
  if (!rates) return null;

  const [rate05, rate1, rate2, rate3, rate4, rate5, baseOver5, perKg] = rates;

  if (weight <= 0.5) return rate05;
  if (weight <= 1) return rate1;
  if (weight <= 2) return rate2;
  if (weight <= 3) return rate3;
  if (weight <= 4) return rate4;
  if (weight <= 5) return rate5;

  // For weight > 5kg, use base rate + (weight - 5) * per kg rate
  return baseOver5 + (weight - 5) * perKg;
}