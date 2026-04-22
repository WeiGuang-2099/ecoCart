# EcoCart Full Upgrade Design

**Date:** 2026-04-23
**Type:** Portfolio project upgrade (job-seeking showcase)
**Scope:** Backend refactor, frontend modernization, new features, docs, CI/CD

---

## 1. Backend Architecture Refactor

### Problem
- `server.js` is a 625-line monolith (routes + business logic + utilities)
- Zero test coverage
- `government-data-integration.js` uses `Math.random()` for distance calculation
- No rate limiting, no security headers

### Target Architecture

```
server/
  app.js                # Express app setup (middleware registration)
  routes/
    barcode.js          # /api/scan-barcode, /api/lookup-barcode
    alternatives.js     # /api/local-alternatives
    pages.js            # /, /privacy-policy
  services/
    carbon.js           # Carbon footprint calculation logic
    barcode.js          # Barcode identification helpers
    gov-data.js         # Government data integration (real data)
    accc.js             # ACCC compliance checker
    alternatives.js     # Local alternatives logic
  middleware/
    security.js         # helmet, rate-limit, privacy headers
    validation.js       # Input validation rules
    error-handler.js    # Unified error handling
  utils/
    helpers.js          # Pure utility functions (roundEmission, etc.)
  __tests__/
    services/           # Unit tests for business logic
    routes/             # API integration tests
```

### Key Changes
- Introduce `helmet` for security headers, `express-rate-limit` for rate limiting
- Replace `Math.random()` in `government-data-integration.js` with deterministic Haversine calculations
- Add Jest tests targeting >70% coverage
- Use custom error classes instead of manual error construction

---

## 2. Frontend Modernization

### Problem
- `index.html` is a 1325-line single file (JS/CSS/HTML mixed)
- No build tooling, no component system
- Default Bootstrap look, no brand identity
- No data visualization

### Target: Vite + React

```
client/
  index.html
  src/
    main.jsx
    App.jsx             # Root component + routing
    pages/
      Home.jsx          # Scan page
      Results.jsx       # Scan results
      History.jsx       # Scan history
      Settings.jsx      # User settings
    components/
      BarcodeScanner.jsx
      CarbonChart.jsx     # Chart.js visualization
      AcccBadge.jsx
      AlternativeCard.jsx
      StoreMap.jsx
      Layout.jsx
    hooks/
      useBarcode.js
      useGeolocation.js
    utils/
      barcode.js
      compression.js
      storage.js
    styles/
      global.css
```

### Key Improvements
- Carbon footprint visualization charts (pie/bar charts for emission breakdown)
- Scan history with localStorage persistence
- Dark mode with CSS variables
- Mobile-first responsive design
- Branded UI beyond Bootstrap defaults

---

## 3. New Features

### 3.1 Scan History & Carbon Tracking
- Store last 50 scans in localStorage
- Cumulative carbon reduction chart (aggregated by week/month)
- Product comparison (side-by-side emission comparison)

### 3.2 Carbon Footprint Visualization
- Donut chart: production/transport/packaging emission proportions
- Bar chart: current product vs alternatives
- Trend chart: user's cumulative carbon reduction over time

### 3.3 PWA Support
- `manifest.json` + Service Worker
- Offline product database cache (IndexedDB)
- Add-to-homescreen support
- Offline barcode scanning (ZXing WASM already supports this)

### 3.4 Internationalization (i18n)
- `react-i18next` integration
- Chinese/English bilingual
- Language files as JSON

---

## 4. External API Integration

### 4.1 Open Food Facts (free, open-source)
- Replace hardcoded mock data
- Query real product info by barcode
- No API key required

### 4.2 Real Geographic Data
- Remove `Math.random()` distance calculations
- Use Haversine formula + city coordinate table for deterministic distances

---

## 5. Deployment & CI/CD

- Docker multi-stage build (frontend build + Node server)
- GitHub Actions: lint -> test -> build -> deploy
- Deploy to Vercel/Railway (free tier)

---

## 6. Documentation Upgrade

- README with architecture diagram (Mermaid)
- Screenshot placeholders
- API documentation (JSDoc + swagger-jsdoc auto-generation)
- `CONTRIBUTING.md`

---

## Implementation Priority Order

1. Backend refactor (architecture split + tests + security)
2. External API integration (Open Food Facts)
3. Frontend React rewrite (core pages)
4. Carbon visualization + scan history
5. PWA support
6. i18n
7. Docker + CI/CD
8. Documentation finalization
