const { extractBarcode } = require('../barcode');

describe('extractBarcode', () => {
  test('returns client-required message with detected=false', async () => {
    const result = await extractBarcode();
    expect(result.detected).toBe(false);
    expect(result.code).toBeNull();
    expect(result.detectionMethod).toBe('client-required');
    expect(result.confidence).toBe(0);
    expect(result.message).toContain('client-side');
  });
});
