'use strict';

const {
  buildCarbonFootprint,
  generateEstimatedProfile
} = require('../carbon');

// ---------------------------------------------------------------------------
// Minimal deps fixture used across tests
// ---------------------------------------------------------------------------
function makeDeps(overrides = {}) {
  return {
    afsisCategories: new Set(['dairy', 'meat', 'vegetables', 'fruits', 'generic_food']),
    validOrigins: new Set(['Australia/Victoria', 'Australia/NSW', 'NewZealand/Auckland']),
    defaultWeights: {
      dairy: 0.5,
      meat: 0.4,
      vegetables: 0.3,
      fruits: 0.35,
      generic_food: 0.3
    },
    emissionFactorMap: {
      dairy: 3.2,
      meat: 6.5,
      vegetables: 0.8,
      fruits: 1.2,
      generic_food: 2.0
    },
    transportFactors: { air: 0.84, sea: 0.02, road_truck: 0.096, rail: 0.025 },
    packagingEmissions: 0.05,
    defaultCategory: 'generic_food',
    defaultOrigin: 'Australia/Victoria',
    ...overrides
  };
}

// ---------------------------------------------------------------------------
// buildCarbonFootprint
// ---------------------------------------------------------------------------
describe('buildCarbonFootprint', () => {
  const deps = makeDeps();

  test('returns total emissions = production + transport + packaging', () => {
    const product = {
      name: 'Test Milk',
      brand: 'DairyCo',
      origin: 'Australia/Victoria',
      category: 'dairy',
      carbonFootprint: {
        product_category: 'dairy',
        origin_location: 'Australia/Victoria',
        weight_kg: 1,
        transport_method: 'road_truck',
        is_fresh_food: false
      }
    };
    const result = buildCarbonFootprint(product, deps);

    const expectedProduction = 1 * 3.2;                     // weight * factor
    const expectedTransport = (1 / 1000) * 0 * 0.096 * 1.0; // weight/1000 * distance * factor * adjustment
    const expectedPackaging = 0.05;
    const expectedTotal = Math.round((expectedProduction + expectedTransport + expectedPackaging) * 1000) / 1000;

    expect(result.co2_kg).toBeCloseTo(expectedTotal, 3);
    expect(result.production_emissions).toBeCloseTo(expectedProduction, 3);
    expect(result.transport_emissions).toBeCloseTo(expectedTransport, 3);
    expect(result.packaging_emissions).toBe(expectedPackaging);
  });

  test('calculates production_emissions = weight_kg * emission_factor', () => {
    const product = {
      name: 'Beef Steak',
      brand: 'MeatFarm',
      origin: 'Australia/NSW',
      category: 'meat',
      carbonFootprint: {
        product_category: 'meat',
        origin_location: 'Australia/NSW',
        weight_kg: 2,
        transport_method: 'road_truck',
        is_fresh_food: false
      }
    };
    const result = buildCarbonFootprint(product, deps);

    expect(result.production_emissions).toBeCloseTo(2 * 6.5, 3);
  });

  test('calculates transport_emissions = (weight_kg/1000) * distance_km * transport_factor * adjustment_factor', () => {
    const product = {
      name: 'Cheese Wheel',
      brand: 'CheeseCo',
      origin: 'NewZealand/Auckland',
      category: 'dairy',
      carbonFootprint: {
        product_category: 'dairy',
        origin_location: 'NewZealand/Auckland',
        weight_kg: 10,
        distance_km: 2500,
        transport_method: 'sea',
        is_fresh_food: false
      }
    };
    const result = buildCarbonFootprint(product, deps);

    const expected = (10 / 1000) * 2500 * 0.02 * 1.0;
    expect(result.transport_emissions).toBeCloseTo(expected, 3);
  });

  test('packaging_emissions is fixed at deps.packagingEmissions', () => {
    const product = {
      name: 'Test',
      brand: 'B',
      origin: 'Australia/Victoria',
      category: 'dairy',
      carbonFootprint: {
        product_category: 'dairy',
        origin_location: 'Australia/Victoria',
        weight_kg: 0.5,
        transport_method: 'road_truck'
      }
    };
    const result = buildCarbonFootprint(product, deps);
    expect(result.packaging_emissions).toBe(0.05);
  });

  test('air freight adjustment for fresh food: adjustment_factor = 5.5', () => {
    const product = {
      name: 'Fresh Berries',
      brand: 'BerryCo',
      origin: 'Australia/Victoria',
      category: 'fruits',
      carbonFootprint: {
        product_category: 'fruits',
        origin_location: 'Australia/Victoria',
        weight_kg: 1,
        distance_km: 5000,
        transport_method: 'air',
        is_fresh_food: true
      }
    };
    const result = buildCarbonFootprint(product, deps);

    expect(result.adjustment_factor).toBe(5.5);
    const expectedTransport = (1 / 1000) * 5000 * 0.84 * 5.5;
    expect(result.transport_emissions).toBeCloseTo(expectedTransport, 3);
  });

  test('non-fresh food: adjustment_factor = 1.0', () => {
    const product = {
      name: 'Frozen Peas',
      brand: 'PeaCo',
      origin: 'Australia/Victoria',
      category: 'vegetables',
      carbonFootprint: {
        product_category: 'vegetables',
        origin_location: 'Australia/Victoria',
        weight_kg: 1,
        distance_km: 5000,
        transport_method: 'air',
        is_fresh_food: false
      }
    };
    const result = buildCarbonFootprint(product, deps);

    expect(result.adjustment_factor).toBe(1.0);
  });

  test('returns productName, brand, origin, category, confidence=high', () => {
    const product = {
      name: 'Test Yogurt',
      brand: 'YogurtBrand',
      origin: 'Australia/Victoria',
      category: 'dairy',
      carbonFootprint: {
        product_category: 'dairy',
        origin_location: 'Australia/Victoria',
        weight_kg: 0.3,
        transport_method: 'road_truck'
      }
    };
    const result = buildCarbonFootprint(product, deps);

    expect(result.productName).toBe('Test Yogurt');
    expect(result.brand).toBe('YogurtBrand');
    expect(result.origin).toBe('Australia/Victoria');
    expect(result.category).toBe('dairy');
    expect(result.confidence).toBe('high');
  });

  test('falls back to category defaults when profile fields are missing', () => {
    const product = {
      name: 'Mystery Item',
      brand: 'Unknown',
      origin: 'UnknownPlace',
      category: 'unknown_cat',
      carbonFootprint: {} // empty profile
    };
    const result = buildCarbonFootprint(product, deps);

    // Should resolve to generic_food defaults
    expect(result.product_category).toBe('generic_food');
    expect(result.weight_kg).toBe(0.3);          // defaultWeights.generic_food
    expect(result.emission_factor).toBe(2.0);     // emissionFactorMap.generic_food
    expect(result.origin_location).toBe('Australia/Victoria');
    expect(result.weight_source).toBe('estimated');
  });
});

// ---------------------------------------------------------------------------
// generateEstimatedProfile
// ---------------------------------------------------------------------------
describe('generateEstimatedProfile', () => {
  const deps = makeDeps();

  test('returns valid profile with co2_kg > 0', () => {
    const result = generateEstimatedProfile('medium', deps);

    expect(result.co2_kg).toBeGreaterThan(0);
    expect(result.production_emissions).toBeGreaterThan(0);
  });

  test('uses "medium" confidence by default', () => {
    const result = generateEstimatedProfile('medium', deps);

    expect(result.confidence).toBe('medium');
  });

  test('brand = "Unknown", category = "Estimate"', () => {
    const result = generateEstimatedProfile('low', deps);

    expect(result.brand).toBe('Unknown');
    expect(result.category).toBe('Estimate');
  });

  test('falls back to generic_food category if unknown category provided', () => {
    const result = generateEstimatedProfile('low', deps, 'nonexistent_category');

    expect(result.product_category).toBe('generic_food');
  });

  test('uses default transport (road_truck, 1000km)', () => {
    const result = generateEstimatedProfile('medium', deps);

    expect(result.transport_method).toBe('road_truck');
    expect(result.distance_km).toBe(1000);
    expect(result.transport_factor).toBe(0.096);
  });
});
