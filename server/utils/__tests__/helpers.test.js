const {
  roundEmission,
  normalizeTransportMethod,
  isAustralianBarcode,
  identifyBarcodeType,
  getBarcodeConfidence,
  resolveProductCategory,
  resolveOriginLocation,
  resolveWeight,
  resolveEmissionFactor,
  resolveDistance
} = require('../helpers');

// ---------------------------------------------------------------------------
// roundEmission
// ---------------------------------------------------------------------------
describe('roundEmission', () => {
  test('rounds a number to 3 decimal places', () => {
    expect(roundEmission(1.23456)).toBeCloseTo(1.235, 3);
  });

  test('rounds 0 correctly', () => {
    expect(roundEmission(0)).toBe(0);
  });

  test('handles string input', () => {
    expect(roundEmission('2.5678')).toBeCloseTo(2.568, 3);
  });

  test('handles null', () => {
    expect(roundEmission(null)).toBe(0);
  });

  test('handles undefined', () => {
    expect(roundEmission(undefined)).toBe(0);
  });

  test('handles already-rounded values', () => {
    expect(roundEmission(1.5)).toBe(1.5);
  });
});

// ---------------------------------------------------------------------------
// normalizeTransportMethod
// ---------------------------------------------------------------------------
describe('normalizeTransportMethod', () => {
  test('returns "air" for air-related input', () => {
    expect(normalizeTransportMethod('Air Freight')).toBe('air');
  });

  test('returns "sea" for sea-related input', () => {
    expect(normalizeTransportMethod('SEA')).toBe('sea');
  });

  test('returns "rail" for rail-related input', () => {
    expect(normalizeTransportMethod('Railway')).toBe('rail');
  });

  test('defaults to "road_truck" for unknown methods', () => {
    expect(normalizeTransportMethod('truck')).toBe('road_truck');
  });

  test('defaults to "road_truck" for empty string', () => {
    expect(normalizeTransportMethod('')).toBe('road_truck');
  });

  test('defaults to "road_truck" when no argument', () => {
    expect(normalizeTransportMethod()).toBe('road_truck');
  });
});

// ---------------------------------------------------------------------------
// isAustralianBarcode
// ---------------------------------------------------------------------------
describe('isAustralianBarcode', () => {
  const prefixes = ['93', '930', '931', '932', '933', '934', '935', '936', '937'];

  test('returns true for barcode starting with 93 (explicit prefixes)', () => {
    expect(isAustralianBarcode('9312345678901', prefixes)).toBe(true);
  });

  test('returns true for barcode starting with 930 (explicit prefixes)', () => {
    expect(isAustralianBarcode('9301234567890', prefixes)).toBe(true);
  });

  test('returns true for barcode starting with 937 (explicit prefixes)', () => {
    expect(isAustralianBarcode('9371234567890', prefixes)).toBe(true);
  });

  test('returns false for non-Australian barcode (explicit prefixes)', () => {
    expect(isAustralianBarcode('5000123456789', prefixes)).toBe(false);
  });

  test('returns false for empty string (explicit prefixes)', () => {
    expect(isAustralianBarcode('', prefixes)).toBe(false);
  });

  test('returns false when no argument (explicit prefixes)', () => {
    expect(isAustralianBarcode(undefined, prefixes)).toBe(false);
  });

  // Default parameter behavior
  test('uses default prefixes when second argument is omitted', () => {
    expect(isAustralianBarcode('9312345678901')).toBe(true);
  });

  test('uses default prefixes for non-Australian barcode when second argument is omitted', () => {
    expect(isAustralianBarcode('5000123456789')).toBe(false);
  });

  test('works with a custom prefix array', () => {
    expect(isAustralianBarcode('1234567890', ['12', '123'])).toBe(true);
    expect(isAustralianBarcode('991234567890', ['12', '123'])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// identifyBarcodeType
// ---------------------------------------------------------------------------
describe('identifyBarcodeType', () => {
  test('identifies EAN-13 (13 digits)', () => {
    expect(identifyBarcodeType('1234567890123')).toBe('EAN-13');
  });

  test('identifies EAN-8 (8 digits)', () => {
    expect(identifyBarcodeType('12345678')).toBe('EAN-8');
  });

  test('identifies UPC-A (12 digits)', () => {
    expect(identifyBarcodeType('123456789012')).toBe('UPC-A');
  });

  test('identifies CODE-128/39 (alphanumeric, 6-16 chars)', () => {
    expect(identifyBarcodeType('ABC123')).toBe('CODE-128/39');
  });

  test('returns Unknown for short strings', () => {
    expect(identifyBarcodeType('AB1')).toBe('Unknown');
  });

  test('returns Unknown for empty string', () => {
    expect(identifyBarcodeType('')).toBe('Unknown');
  });

  test('returns Unknown when no argument', () => {
    expect(identifyBarcodeType()).toBe('Unknown');
  });
});

// ---------------------------------------------------------------------------
// getBarcodeConfidence
// ---------------------------------------------------------------------------
describe('getBarcodeConfidence', () => {
  const prefixes = ['93', '930', '931', '932', '933', '934', '935', '936', '937'];

  test('returns base 0.9 for non-standard, non-Australian barcode (explicit prefixes)', () => {
    // 14 digits -- not a standard type, not Australian
    expect(getBarcodeConfidence('50001234567890', prefixes)).toBe(0.9);
  });

  test('adds 0.05 for Australian barcode (non-standard type, explicit prefixes)', () => {
    // Australian prefix but alphanumeric so not a standard type
    expect(getBarcodeConfidence('93ABCDEF', prefixes)).toBeCloseTo(0.95, 10);
  });

  test('adds 0.03 for standard type (EAN-13, explicit prefixes)', () => {
    // Standard type but not Australian
    expect(getBarcodeConfidence('1234567890123', prefixes)).toBe(0.93);
  });

  test('caps at 0.98 for Australian + standard type (explicit prefixes)', () => {
    // Australian EAN-13 => 0.9 + 0.05 + 0.03 = 0.98
    expect(getBarcodeConfidence('9312345678901', prefixes)).toBe(0.98);
  });

  test('does not exceed 0.98 (explicit prefixes)', () => {
    // Even if both bonuses apply, should not exceed 0.98
    const result = getBarcodeConfidence('9301234567890', prefixes);
    expect(result).toBeLessThanOrEqual(0.98);
  });

  test('returns 0.9 for empty string (explicit prefixes)', () => {
    expect(getBarcodeConfidence('', prefixes)).toBe(0.9);
  });

  test('returns 0.9 when no argument (explicit prefixes)', () => {
    expect(getBarcodeConfidence(undefined, prefixes)).toBe(0.9);
  });

  // Default parameter behavior
  test('uses default prefixes when second argument is omitted', () => {
    expect(getBarcodeConfidence('9312345678901')).toBe(0.98);
  });

  test('works with a custom prefix array', () => {
    // '12' is a custom prefix, so 1234567890123 is Australian with custom prefixes
    expect(getBarcodeConfidence('1234567890123', ['12'])).toBe(0.98);
    // Without the custom prefix, 1234567890123 is NOT Australian
    expect(getBarcodeConfidence('1234567890123')).toBe(0.93);
  });
});

// ---------------------------------------------------------------------------
// resolveProductCategory
// ---------------------------------------------------------------------------
describe('resolveProductCategory', () => {
  const afsisCategories = new Set(['cereals', 'dairy', 'meat']);
  const defaultCategory = 'generic_food';

  test('returns categoryCode if it exists in set', () => {
    expect(resolveProductCategory('dairy', afsisCategories, defaultCategory)).toBe('dairy');
  });

  test('returns default for unknown category', () => {
    expect(resolveProductCategory('electronics', afsisCategories, defaultCategory)).toBe('generic_food');
  });

  test('returns default for null categoryCode', () => {
    expect(resolveProductCategory(null, afsisCategories, defaultCategory)).toBe('generic_food');
  });

  test('returns default for undefined categoryCode', () => {
    expect(resolveProductCategory(undefined, afsisCategories, defaultCategory)).toBe('generic_food');
  });

  test('returns default for empty string', () => {
    expect(resolveProductCategory('', afsisCategories, defaultCategory)).toBe('generic_food');
  });
});

// ---------------------------------------------------------------------------
// resolveOriginLocation
// ---------------------------------------------------------------------------
describe('resolveOriginLocation', () => {
  const validOrigins = new Set(['Australia/Victoria', 'Australia/NSW', 'New Zealand']);
  const defaultOrigin = 'Australia/Victoria';

  test('returns originLocation if valid', () => {
    expect(resolveOriginLocation('Australia/NSW', validOrigins, defaultOrigin)).toBe('Australia/NSW');
  });

  test('returns default for invalid origin', () => {
    expect(resolveOriginLocation('China', validOrigins, defaultOrigin)).toBe('Australia/Victoria');
  });

  test('returns default for null', () => {
    expect(resolveOriginLocation(null, validOrigins, defaultOrigin)).toBe('Australia/Victoria');
  });

  test('returns default for undefined', () => {
    expect(resolveOriginLocation(undefined, validOrigins, defaultOrigin)).toBe('Australia/Victoria');
  });

  test('returns default for empty string', () => {
    expect(resolveOriginLocation('', validOrigins, defaultOrigin)).toBe('Australia/Victoria');
  });
});

// ---------------------------------------------------------------------------
// resolveWeight
// ---------------------------------------------------------------------------
describe('resolveWeight', () => {
  const defaultWeights = { cereals: 0.5, dairy: 1.0, generic_food: 0.3 };
  const fallbackWeight = 0.3;

  test('uses reported weight from profile', () => {
    const profile = { weight_kg: 2.5, weight_source: 'reported' };
    const result = resolveWeight(profile, 'cereals', defaultWeights, fallbackWeight);
    expect(result).toEqual({ weightKg: 2.5, weightSource: 'reported' });
  });

  test('marks estimated source when weight_source is "estimated"', () => {
    const profile = { weight_kg: 1.8, weight_source: 'estimated' };
    const result = resolveWeight(profile, 'cereals', defaultWeights, fallbackWeight);
    expect(result).toEqual({ weightKg: 1.8, weightSource: 'estimated' });
  });

  test('falls back to category default weight', () => {
    const profile = {};
    const result = resolveWeight(profile, 'dairy', defaultWeights, fallbackWeight);
    expect(result).toEqual({ weightKg: 1.0, weightSource: 'estimated' });
  });

  test('falls back to default category weight when category not in map', () => {
    const profile = {};
    const result = resolveWeight(profile, 'unknown_cat', defaultWeights, fallbackWeight);
    expect(result).toEqual({ weightKg: 0.3, weightSource: 'estimated' });
  });

  test('uses fallbackWeight when neither category nor default category match', () => {
    const profile = {};
    const weights = { cereals: 0.5 };
    const result = resolveWeight(profile, 'unknown_cat', weights, 0.25);
    expect(result).toEqual({ weightKg: 0.25, weightSource: 'estimated' });
  });

  test('uses fallbackWeight when defaultWeights is empty', () => {
    const profile = {};
    const result = resolveWeight(profile, 'cereals', {}, 0.4);
    expect(result).toEqual({ weightKg: 0.4, weightSource: 'estimated' });
  });
});

// ---------------------------------------------------------------------------
// resolveEmissionFactor
// ---------------------------------------------------------------------------
describe('resolveEmissionFactor', () => {
  const emissionFactorMap = { cereals: 1.5, dairy: 3.0, generic_food: 2 };
  const defaultFactor = 2;

  test('uses profile factor when it is a number', () => {
    expect(resolveEmissionFactor(4.2, 'cereals', emissionFactorMap, defaultFactor)).toBe(4.2);
  });

  test('falls back to category emission factor', () => {
    expect(resolveEmissionFactor(null, 'dairy', emissionFactorMap, defaultFactor)).toBe(3.0);
  });

  test('falls back to default category factor', () => {
    expect(resolveEmissionFactor(null, 'unknown_cat', emissionFactorMap, defaultFactor)).toBe(2);
  });

  test('falls back to defaultFactor when map has no default category', () => {
    const map = { cereals: 1.5 };
    expect(resolveEmissionFactor(null, 'unknown_cat', map, 2.5)).toBe(2.5);
  });

  test('ignores non-number profile factor (string)', () => {
    expect(resolveEmissionFactor('high', 'cereals', emissionFactorMap, defaultFactor)).toBe(1.5);
  });

  test('ignores non-number profile factor (undefined)', () => {
    expect(resolveEmissionFactor(undefined, 'cereals', emissionFactorMap, defaultFactor)).toBe(1.5);
  });
});

// ---------------------------------------------------------------------------
// resolveDistance
// ---------------------------------------------------------------------------
describe('resolveDistance', () => {
  test('uses profile.distance_km when available', () => {
    const profile = { distance_km: 500 };
    expect(resolveDistance(profile, {})).toBe(500);
  });

  test('uses profile.transport_km when distance_km is not available', () => {
    const profile = { transport_km: 300 };
    expect(resolveDistance(profile, {})).toBe(300);
  });

  test('prefers distance_km over transport_km', () => {
    const profile = { distance_km: 100, transport_km: 300 };
    expect(resolveDistance(profile, {})).toBe(100);
  });

  test('uses product.freightData.distance_km as third option', () => {
    const profile = {};
    const product = { freightData: { distance_km: 200 } };
    expect(resolveDistance(profile, product)).toBe(200);
  });

  test('returns null when no distance info is available', () => {
    expect(resolveDistance({}, {})).toBeNull();
  });

  test('returns null when no arguments', () => {
    expect(resolveDistance()).toBeNull();
  });
});
