const request = require('supertest');
const { createApp } = require('../app');

describe('API Endpoints', () => {
  let app;

  beforeAll(() => {
    app = createApp();
  });

  describe('GET /api/lookup-barcode', () => {
    test('returns product data for valid barcode', async () => {
      const res = await request(app)
        .get('/api/lookup-barcode?barcode=9330777000015');
      expect(res.status).toBe(200);
      expect(res.body.barcode).toBeDefined();
      expect(res.body.barcode.code).toBe('9330777000015');
      expect(res.body.carbonFootprint).toBeDefined();
      expect(res.body.carbonFootprint.co2_kg).toBeGreaterThan(0);
      expect(res.body.alternatives).toBeDefined();
      expect(res.body.alternatives.length).toBeGreaterThan(0);
      expect(res.body.governmentData).toBeDefined();
      expect(res.body.acccCompliance).toBeDefined();
      expect(res.body.privacyCompliance).toBeDefined();
    });

    test('rejects invalid barcode (too short)', async () => {
      const res = await request(app)
        .get('/api/lookup-barcode?barcode=123');
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    test('rejects invalid barcode (too long)', async () => {
      const res = await request(app)
        .get('/api/lookup-barcode?barcode=1234567890123456789');
      expect(res.status).toBe(400);
    });

    test('returns estimated profile for unknown barcode', async () => {
      const res = await request(app)
        .get('/api/lookup-barcode?barcode=999999999999');
      expect(res.status).toBe(200);
      expect(res.body.carbonFootprint.confidence).toBe('medium');
    });
  });

  describe('POST /api/lookup-barcode', () => {
    test('accepts valid JSON body', async () => {
      const res = await request(app)
        .post('/api/lookup-barcode')
        .send({ barcode: '9330777000015', detectionMethod: 'client-decode' });
      expect(res.status).toBe(200);
      expect(res.body.barcode.code).toBe('9330777000015');
      expect(res.body.barcode.detectionMethod).toBe('client-decode');
    });

    test('rejects missing barcode', async () => {
      const res = await request(app)
        .post('/api/lookup-barcode')
        .send({});
      expect(res.status).toBe(400);
    });

    test('rejects non-string barcode', async () => {
      const res = await request(app)
        .post('/api/lookup-barcode')
        .send({ barcode: 123456 });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/local-alternatives', () => {
    test('returns nearby stores for Sydney', async () => {
      const res = await request(app)
        .post('/api/local-alternatives')
        .send({ productCategory: 'Food', userLocation: { lat: -33.87, lng: 151.21 } });
      expect(res.status).toBe(200);
      expect(res.body.nearbyStores).toBeDefined();
      expect(res.body.recommendations).toBeDefined();
      expect(res.body.searchLocation).toBeDefined();
      expect(res.body.totalStoresFound).toBeGreaterThanOrEqual(0);
    });

    test('rejects invalid coordinates', async () => {
      const res = await request(app)
        .post('/api/local-alternatives')
        .send({ userLocation: { lat: 999, lng: 0 } });
      expect(res.status).toBe(400);
    });

    test('rejects missing location', async () => {
      const res = await request(app)
        .post('/api/local-alternatives')
        .send({ productCategory: 'Food' });
      expect(res.status).toBe(400);
    });
  });

  describe('GET /', () => {
    test('serves index.html', async () => {
      const res = await request(app).get('/');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('html');
    });
  });

  describe('GET /privacy-policy', () => {
    test('serves privacy-policy.html', async () => {
      const res = await request(app).get('/privacy-policy');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('html');
    });
  });

  describe('404 handler', () => {
    test('returns JSON 404 for unknown routes', async () => {
      const res = await request(app).get('/api/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.error).toBeDefined();
    });
  });

  describe('Security headers', () => {
    test('sets privacy compliance headers', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-privacy-compliance']).toBe('AU-Privacy-Act-1988');
      expect(res.headers['x-data-retention']).toBe('0-days');
    });

    test('sets helmet security headers', async () => {
      const res = await request(app).get('/');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-frame-options']).toBeDefined();
    });
  });
});
