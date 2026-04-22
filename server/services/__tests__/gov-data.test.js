const AustralianDataIntegration = require('../gov-data');

describe('AustralianDataIntegration', () => {
  const service = new AustralianDataIntegration();

  test('identifies Australian products by barcode prefix', async () => {
    const result = await service.getAFSISProductInfo('9330777000015');
    expect(result.productOrigin.country).toBe('Australia');
    expect(result.productOrigin.confidence).toBe('high');
  });

  test('identifies imported products', async () => {
    const result = await service.getAFSISProductInfo('6931234567890');
    expect(result.productOrigin.country).toBe('Imported');
  });

  test('calculates distance deterministically (no Math.random)', async () => {
    const r1 = await service.getFreightEmissions('9330777000015', 'Sydney, NSW', 'Melbourne, VIC');
    const r2 = await service.getFreightEmissions('9330777000015', 'Sydney, NSW', 'Melbourne, VIC');
    expect(r1.totalDistance_km).toBe(r2.totalDistance_km);
    expect(r1.totalDistance_km).toBeGreaterThan(0);
  });

  test('Sydney-Melbourne distance is ~880km', async () => {
    const result = await service.getFreightEmissions('test', 'Sydney', 'Melbourne');
    expect(result.totalDistance_km).toBe(880);
  });

  test('Sydney-Brisbane distance is ~730km', async () => {
    const result = await service.getFreightEmissions('test', 'Sydney', 'Brisbane');
    expect(result.totalDistance_km).toBe(730);
  });

  test('caches results', async () => {
    const r1 = await service.getAFSISProductInfo('9330777000015');
    const r2 = await service.getAFSISProductInfo('9330777000015');
    expect(r1.lastUpdated).toBe(r2.lastUpdated);
  });

  test('returns data quality metrics', () => {
    const metrics = service.getDataQualityMetrics();
    expect(metrics.afsisReliability).toBeDefined();
  });

  test('returns fallback data on error', async () => {
    const result = service.getFallbackAFSISData('0000000000000');
    expect(result.productOrigin).toBeDefined();
    expect(result.dataSource).toContain('Fallback');
  });
});
