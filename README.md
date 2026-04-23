# EcoCart

**Supermarket Carbon Footprint Scanner** -- Scan product barcodes, estimate cradle-to-shelf carbon emissions, and discover local eco-friendly alternatives.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node: 18+](https://img.shields.io/badge/Node-18%2B-green.svg)](https://nodejs.org/)
[![Tests: 120+](https://img.shields.io/badge/Tests-120%2B-brightgreen.svg)](#testing)

---

## Architecture

```mermaid
graph TB
    Browser[Browser / PWA] -->|Barcode Scan| API[Express API Server]
    API --> Carbon[Carbon Service]
    API --> ACCC[ACCC Compliance Service]
    API --> OFF[Open Food Facts API]
    API --> Local[Local Alternatives Service]
    API --> Gov[Gov Data Service]
    Carbon --> DB[Product Database]
```

The backend follows a layered architecture with dependency injection. Route handlers receive service instances through a factory pattern, keeping modules testable and loosely coupled.

## Features

- **Barcode scanning** -- Browser-native `BarcodeDetector` with ZXing WASM fallback; images never leave the device
- **Carbon footprint estimation** -- Production, transport, and packaging emissions based on per-category emission factors and configurable transport modes
- **ACCC greenwashing detection** -- Flags vague or certification-required sustainability claims
- **Open Food Facts integration** -- Enriches product data from the global open database
- **Local eco alternatives** -- Nearby refill, organic, and zero-waste stores with comparison metrics
- **PWA support** -- Installable, works offline with cached assets
- **Internationalization** -- English and Chinese UI via i18next
- **Privacy-first** -- In-memory-only image processing, zero data retention, Privacy Act 1988 compliant

## Tech Stack

| Layer      | Technologies                                                       |
|------------|--------------------------------------------------------------------|
| Backend    | Node.js 18+, Express 4, Multer, Helmet, express-rate-limit        |
| Frontend   | React 19, Vite 8, Chart.js, ZXing                                 |
| Data       | 1 220+ Australian products, Open Food Facts API                    |
| DevOps     | Docker, GitHub Actions CI, ESLint, Prettier, Jest                  |

## Project Structure

```
ecoCart/
  server.js                   # Entry point, starts HTTP server
  server/
    app.js                    # Express app setup, DI container
    routes/
      barcode.js              # Barcode scan and lookup endpoints
      alternatives.js         # Local alternatives endpoint
      pages.js                # Static page routes
    services/
      carbon.js               # Carbon footprint calculations
      barcode.js              # Barcode decoding logic
      accc.js                 # ACCC greenwashing checks
      alternatives.js         # Local alternatives lookup
      gov-data.js             # Government data integration
      open-food-facts.js      # OFF API client
    middleware/
      validation.js           # Request validation rules
      security.js             # Security headers and rate limiting
      error-handler.js        # Centralized error handling
    utils/
      helpers.js              # Shared utility functions
    __tests__/
      api.test.js             # API integration tests
  client/
    src/
      main.jsx                # React entry point
      App.jsx                 # Root component with routing
      components/             # Reusable UI components
      pages/                  # Page-level views (Home, Results, History, Settings)
      hooks/                  # Custom React hooks
      i18n/                   # Internationalization config and locales
      styles/                 # Global CSS
      utils/                  # Browser-side utilities
    public/                   # Static assets (PWA icons, favicons)
    vite.config.js            # Vite build configuration
  config/
    index.js                  # Centralized configuration
  data/
    australian-products.json  # Product catalog (1 220+ items)
    australian-keywords.json  # OCR keyword heuristics
  scripts/
    generate-products.js      # Product data generator
  .github/
    workflows/ci.yml          # GitHub Actions CI pipeline
```

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 9 or later

### Install

```bash
# Clone the repository
git clone https://github.com/<your-org>/ecoCart.git
cd ecoCart

# Install backend dependencies
npm install

# Install frontend dependencies
cd client && npm install && cd ..
```

### Configure

Create a `.env` file in the project root:

```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173   # Comma-separated allowed origins for production
```

### Run

```bash
# Development (backend with auto-reload)
npm run dev

# Development (frontend dev server, separate terminal)
npm run client

# Production
npm start
```

The backend serves at `http://localhost:5000`. The Vite dev server (default port 5173) proxies API requests to the backend.

## API Documentation

| Method | Path                     | Description                                              |
|--------|--------------------------|----------------------------------------------------------|
| POST   | `/api/scan-barcode`      | Upload a barcode image; returns carbon data, claims, and alternatives |
| GET    | `/api/lookup-barcode`    | Lookup a barcode by query parameter `barcode`            |
| POST   | `/api/lookup-barcode`    | Submit a decoded barcode; same response as scan without image upload |
| POST   | `/api/local-alternatives`| Find nearby eco stores by category and location          |
| GET    | `/`                      | Serve the React frontend                                 |
| GET    | `/privacy-policy`        | Serve the privacy policy page                            |

### POST /api/scan-barcode

**Request:** `multipart/form-data` with an `image` field (max 5 MB).

**Response (abbreviated):**

```json
{
  "barcode": { "detected": true, "code": "9330777000015", "type": "EAN-13" },
  "carbonFootprint": {
    "co2_kg": 1.23,
    "production_emissions": 1.1,
    "transport_emissions": 0.08,
    "packaging_emissions": 0.05
  },
  "ecoClaims": { "claims": [] },
  "alternatives": [],
  "acccCompliance": {
    "acccCompliance": {
      "status": "compliant",
      "riskLevel": "low",
      "warnings": [],
      "recommendations": []
    }
  }
}
```

### POST /api/lookup-barcode

**Request:**

```json
{ "barcode": "9330777000015", "detectionMethod": "client-decode" }
```

### POST /api/local-alternatives

**Request:**

```json
{ "productCategory": "Food", "userLocation": { "lat": -33.8688, "lng": 151.2093 } }
```

## Architecture Details

The Express application is assembled in `server/app.js` using a dependency-injection pattern:

1. **Config** is loaded from `config/index.js` and `.env`.
2. **Services** (carbon, barcode, ACCC, alternatives, gov-data, open-food-facts) are instantiated with config and data.
3. **Routes** receive service references through a `deps` object, avoiding global singletons.
4. **Middleware** layers handle validation, security headers, rate limiting, and error normalization.

This structure keeps every module independently testable -- services can be mocked or stubbed without touching the Express app.

## Testing

The project uses Jest with Supertest for integration tests.

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

The test suite includes over 120 tests covering API endpoints, service logic, and edge cases.

## Deployment

### Docker

```bash
# Build the image
docker build -t ecocart .

# Run the container
docker run -p 5000:5000 --env-file .env ecocart
```

### CI

GitHub Actions runs linting and tests on every push. The workflow is defined in `.github/workflows/ci.yml`.

## Scripts

| Command               | Description                          |
|-----------------------|--------------------------------------|
| `npm start`           | Start the production server          |
| `npm run dev`         | Start backend with nodemon           |
| `npm run client`      | Start the Vite frontend dev server   |
| `npm run build`       | Build the React frontend for production |
| `npm test`            | Run the Jest test suite              |
| `npm run test:watch`  | Run tests in watch mode              |
| `npm run test:coverage`| Generate test coverage report       |
| `npm run lint`        | Lint JavaScript files with ESLint    |
| `npm run lint:fix`    | Auto-fix linting issues              |
| `npm run format`      | Format code with Prettier            |
| `npm run format:check`| Check formatting without writing     |

## Data Sources

- **Local product database** -- 1 220+ Australian supermarket products with per-category emission factors, origin locations, and default weights (curated dataset)
- **Open Food Facts** -- Global open product database for barcode enrichment
- **Government data service** -- Australian product origin and certification lookup (barcode prefix-based heuristics; real AFSIS integration pending government API access)
- **Transport factors** -- Mode-specific emission rates (air, sea, rail, road) used for freight estimation
- **City distance table** -- Major Australian inter-city distances for domestic freight calculation

## License

MIT License. See the [LICENSE](LICENSE) file for details.
