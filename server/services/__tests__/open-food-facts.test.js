const { getProductByBarcode } = require('../open-food-facts');

describe('Open Food Facts integration', () => {
  test('returns product data for a valid barcode', async () => {
    // Use a well-known barcode from the OFF database
    const result = await getProductByBarcode('5000112637922'); // Coca-Cola
    expect(result).toBeDefined();
    expect(result.status).toBe(1); // 1 = found
    expect(result.product).toBeDefined();
    expect(result.product.product_name).toBeDefined();
  }, 15000);

  test('returns status 0 for unknown barcode', async () => {
    const result = await getProductByBarcode('0000000000000');
    expect(result).toBeDefined();
    expect(result.status).toBe(0); // 0 = not found
  }, 15000);

  test('handles network errors gracefully', async () => {
    const result = await getProductByBarcode('5000112637922', { baseUrl: 'http://invalid-host-that-does-not-exist.test' });
    expect(result).toBeDefined();
    expect(result.error).toBeDefined();
  }, 15000);

  test('extracts relevant product fields', async () => {
    const result = await getProductByBarcode('5000112637922');
    if (result.status === 1) {
      expect(result.product.product_name).toBeDefined();
      // These fields may or may not be present, just verify structure
      expect(typeof result.product).toBe('object');
    }
  }, 15000);
});
