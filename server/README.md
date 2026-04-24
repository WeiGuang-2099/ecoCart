# EcoCart Server

Express 4 backend for the EcoCart carbon footprint scanner. Handles barcode lookup, YOLOv8n object detection, carbon footprint calculation, ACCC compliance checks, and eco store lookups.

## Tech Stack

| Category       | Technology                                              |
|----------------|---------------------------------------------------------|
| Runtime        | Node.js 18+, Express 4                                  |
| AI/ML          | YOLOv8n via ONNX Runtime (CPU), lazy-loaded singleton   |
| Image          | Sharp for preprocessing, letterbox resize, region crops  |
| Upload         | Multer with memory storage, 5 MB limit                   |
| Validation     | express-validator for request bodies and query params    |
| Security       | Helmet (CSP), express-rate-limit (100 req / 15 min)      |
| Testing        | Jest + Supertest (120+ tests)                            |

## Directory Structure

```
server/
  app.js                          # Express app factory with DI container
  routes/
    barcode.js                    # /api/scan-barcode, /api/lookup-barcode (GET + POST)
    alternatives.js               # /api/local-alternatives
    pages.js                      # Static page routes (/privacy-policy)
  services/
    carbon.js                     # buildCarbonFootprint(), generateEstimatedProfile()
    yolo-detector.js              # YoloDetector singleton (lazy ONNX session, NMS)
    accc.js                       # ACCCComplianceChecker -- greenwashing detection
    alternatives.js               # LocalAlternativesMap -- eco store finder
    gov-data.js                   # AustralianDataIntegration -- AFSIS, freight, origin
    open-food-facts.js            # OFF API client
    __tests__/
      carbon.test.js
      barcode.test.js
      accc.test.js
      alternatives.test.js
      gov-data.test.js
      open-food-facts.test.js
  middleware/
    security.js                   # Helmet CSP, rate limiter, privacy headers
    validation.js                 # express-validator rules for barcode and alternatives
    error-handler.js              # Centralized error JSON responses
  utils/
    helpers.js                    # Barcode type/origin/confidence, emission/weight resolvers
    image-preprocess.js           # prepareForYolo(), cropRegion(), extractBarcodeRegions()
    __tests__/
      helpers.test.js
  __tests__/
    api.test.js                   # Supertest integration tests
```

## Dependency Injection

`createApp()` in `app.js` builds a `deps` object and passes it to route factories:

```
deps = {
  config, products, productMetadata,
  afsisCategories, validOrigins, defaultWeights,
  emissionFactorMap, transportFactors,
  packagingEmissions, defaultCategory, defaultOrigin,
  carbonService, offService, acccService,
  govDataService, localMapService
}
```

Each route file exports `function(deps) { ... return router; }`, so services are injectable and testable without touching the Express app.

## API Endpoints

### POST /api/scan-barcode

Upload a barcode image (multipart/form-data, max 5 MB). The server:

1. Preprocesses the image via Sharp (letterbox resize to 640x640)
2. Runs YOLOv8n inference (ONNX Runtime, CPU)
3. Extracts barcode candidate regions (bottom 30% of detections, with padding)
4. Crops each region to base64 PNG
5. Returns detection results + carbon data + alternatives

### POST /api/lookup-barcode

Submit a decoded barcode as JSON:

```json
{ "barcode": "9330777000015", "detectionMethod": "client-decode" }
```

Returns full product data: carbon footprint, alternatives, ACCC compliance, government data, and Open Food Facts enrichment.

### GET /api/lookup-barcode

Same as POST but via query parameter: `GET /api/lookup-barcode?barcode=9330777000015`

### POST /api/local-alternatives

Find nearby eco stores:

```json
{ "productCategory": "Food", "userLocation": { "lat": -33.8688, "lng": 151.2093 } }
```

Returns store recommendations, nearby stores with coordinates, and a store comparison table.

## Services

### Carbon Service (`services/carbon.js`)

Two modes:
- `buildCarbonFootprint(product, deps)` -- calculates from a known product record using per-category emission factors, transport distances, and packaging weight
- `generateEstimatedProfile(confidence, deps)` -- produces an estimate when the barcode is not in the database

Both return production, transport, and packaging emissions (kg CO2e) with a full breakdown.

### YOLO Detector (`services/yolo-detector.js`)

Singleton that lazily loads the ONNX model on first request. Features:
- Letterbox preprocessing (640x640 with gray padding)
- Confidence threshold: 0.5
- NMS IoU threshold: 0.45
- Max 10 detections per image
- 5-second inference timeout
- Filters to 24 product-relevant COCO classes (bottle, cup, food items, electronics)

### ACCC Checker (`services/accc.js`)

Validates sustainability claims against Australian consumer law:
- Flags vague comparative language ("greener", "more eco")
- Requires evidence for "carbon neutral", "certified organic", "zero waste"
- Checks references to Australian standards (ACO, Climate Active, GECA)
- Returns risk level (low/medium/high) with warnings and recommendations

### Government Data (`services/gov-data.js`)

Australian data integration with in-memory 24h cache:
- Product origin from barcode prefix (930-937 = Australian)
- City-to-city distance table (17 routes)
- Freight emission factors by transport mode
- Supply chain transparency scoring

### Image Preprocessing (`utils/image-preprocess.js`)

- `prepareForYolo(buffer)` -- Sharp resize, letterbox canvas, HWC-to-NCHW float32 tensor
- `cropRegion(buffer, bbox)` -- Extract a padded region as base64 PNG
- `extractBarcodeRegions(detections, w, h)` -- Heuristic: bottom 30% + wider strip, IoU dedup

## Testing

```bash
# From the project root
npm test                 # Run all tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
```

The test suite covers:
- API endpoint integration tests (Supertest against `createApp()`)
- Individual service unit tests with mock deps
- Helper function unit tests
- 120+ tests total, 70%+ coverage target

## Security

- Helmet with CSP (scripts from self + CDN, images from self/data/blob)
- Rate limiting: 100 requests per 15 minutes on `/api/` routes
- Privacy headers: `X-Privacy-Compliance: AU-Privacy-Act-1988`, `X-Data-Retention: 0-days`
- No data persistence -- images processed in memory and cleared after response
- Input validation via express-validator on all POST endpoints
