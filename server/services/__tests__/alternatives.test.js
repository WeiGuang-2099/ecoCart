const LocalAlternativesMap = require('../alternatives');

describe('LocalAlternativesMap', () => {
  const map = new LocalAlternativesMap();

  test('finds nearest city for Sydney coordinates', () => {
    const result = map.findNearestCity(-33.87, 151.21);
    expect(result.city).toBe('Sydney');
  });

  test('finds nearest city for Melbourne coordinates', () => {
    const result = map.findNearestCity(-37.81, 144.96);
    expect(result.city).toBe('Melbourne');
  });

  test('calculates distance between two points (Sydney-Melbourne)', () => {
    const dist = map.calculateDistance(-33.87, 151.21, -37.81, 144.96);
    expect(dist).toBeGreaterThan(700);
    expect(dist).toBeLessThan(900);
  });

  test('finds eco stores nearby Sydney', () => {
    const result = map.findEcoStoresNearby(-33.87, 151.21, 50);
    expect(result.stores.length).toBeGreaterThan(0);
    expect(result.stores[0].name).toBeDefined();
    expect(result.stores[0].distance).toBeDefined();
  });

  test('getStoreRecommendations returns filtered results', () => {
    const result = map.getStoreRecommendations('Food', -33.87, 151.21);
    expect(result.recommendations).toBeDefined();
    expect(result.searchLocation).toBeDefined();
  });

  test('generates store comparison', () => {
    const nearby = map.findEcoStoresNearby(-33.87, 151.21, 50);
    const comparison = map.generateStoreComparison(nearby.stores);
    expect(comparison.length).toBeGreaterThan(0);
    expect(comparison[0].name).toBeDefined();
    expect(comparison[0].distance).toBeDefined();
  });

  test('calculates transport emissions for driving', () => {
    const emissions = map.calculateTransportEmissions(100, 'driving');
    expect(emissions).toBe(21); // 100 * 0.21
  });

  test('calculates transport emissions for walking (zero)', () => {
    const emissions = map.calculateTransportEmissions(100, 'walking');
    expect(emissions).toBe(0);
  });
});
