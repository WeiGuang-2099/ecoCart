# EcoCart Client

React 19 PWA frontend for the EcoCart carbon footprint scanner. Upload or drag-drop a barcode image, get instant carbon emission data, eco-friendly alternatives, and ACCC compliance checks.

## Tech Stack

| Category       | Technology                                              |
|----------------|---------------------------------------------------------|
| Framework      | React 19, Vite 8                                        |
| Routing        | React Router DOM 7                                      |
| Charts         | Chart.js + react-chartjs-2 (Doughnut, Bar)              |
| Maps           | Leaflet + react-leaflet (OpenStreetMap tiles)           |
| Barcode        | BarcodeDetector API + @zxing/library WASM fallback      |
| i18n           | i18next + react-i18next (English, Chinese)              |
| PWA            | vite-plugin-pwa + Workbox runtime caching               |
| Testing        | Vitest + Testing Library (configured, pending test files)|
| Linting        | ESLint with React Hooks and React Refresh plugins       |

## Pages

### Home (`/`)

Hero section and the barcode scanner component. Supports image upload via click or drag-and-drop.

### Results (`/results`)

Receives scan data via React Router location state. Displays:
- **Barcode info** -- detected code, type, method, confidence bar, Australian/imported badge
- **Carbon footprint** -- total CO2e with production/transport/packaging breakdown and a Doughnut chart
- **ACCC compliance** -- risk level, warnings, and recommendations badge
- **Government data** -- origin country and certifications (when available)
- **Eco alternatives** -- cards with CO2 savings, price comparison, suggested brands
- **Emission comparison** -- horizontal Bar chart comparing current product vs alternatives
- **Nearby eco stores** -- Leaflet map with store markers and distance popups

### History (`/history`)

Scan history stored in localStorage (max 50 records). Shows total scans count, cumulative CO2 savings, and a chronological list with product name, brand, and emission value.

### Settings (`/settings`)

- **Dark mode** -- toggles `data-theme="dark"` on the document root
- **Default city** -- selects from 8 Australian capitals; used for eco store lookups
- **Language** -- English / Chinese switch via i18next
- **Scan history** -- shows record count, clear button
- **About** -- version info and privacy notice

## Components

| Component          | Description                                                        |
|--------------------|--------------------------------------------------------------------|
| `Layout`           | Header with nav links (Scan, History, Settings), footer, Outlet    |
| `BarcodeScanner`   | File upload, image compression, 4-variant preprocessing, multi-pass decode, YOLO fallback pipeline |
| `CarbonChart`      | Doughnut chart of production / transport / packaging emissions     |
| `EmissionComparison` | Horizontal Bar chart comparing current vs alternative emissions  |
| `AlternativeCard`  | Single eco alternative card with name, description, CO2 reduction, price |
| `AcccBadge`        | ACCC compliance status badge with warnings and recommendations     |
| `EcoStoreMap`      | Leaflet MapContainer with user location and eco store markers      |
| `ErrorBoundary`    | Catches render errors and displays fallback UI                     |

## Barcode Scanning Pipeline

The scanner implements a four-level fallback entirely in the browser before falling back to the server:

```
1. Client multi-pass decode
   compressImage() -> 4 Canvas variants:
     - Original
     - Grayscale + contrast stretch (factor 1.5)
     - Adaptive binarization (integral image, block 15, offset 10)
     - Sharpen (3x3 kernel: center=5, cardinal=-1)
   Each variant tried with:
     - Native BarcodeDetector (EAN-13, EAN-8, UPC-A, UPC-E, Code-128, Code-39)
     - ZXing WASM (3-second timeout)

2. YOLO region decode (server fallback)
   POST /api/scan-barcode -> server crops barcode regions
   Client decodes each region with BarcodeDetector + ZXing

3. YOLO category only
   Show detected product category and confidence, prompt manual entry

4. Manual retry
   "Unable to read barcode" message with Try Again button
```

When client decode succeeds on the first try, the image is sent to the server asynchronously for YOLO enrichment (fire-and-forget). The results page updates with the detected product category without blocking navigation.

## Hooks

### `useScanHistory`

Manages scan history in localStorage with a 50-record cap. Returns `{ history, totalReduction, add, remove, clear }`. Listens for `storage` events to stay in sync with writes from `addScanRecord()`.

## PWA Configuration

Configured via `vite-plugin-pwa` with:
- **autoUpdate** register type
- SVG icons (192x192, 512x512)
- Standalone display mode, green theme (#27ae60)
- Workbox runtime caching:
  - Open Food Facts API responses -- NetworkFirst, 24h TTL, 100 entries
  - `/api/` requests -- NetworkFirst, 5min TTL, 50 entries

## Development

```bash
# Install dependencies
npm install

# Start dev server (proxies /api and /privacy-policy to localhost:5000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

The dev server runs at `http://localhost:5173` and proxies API requests to the backend at `localhost:5000`.

## Image Processing

Client-side image compression runs before any barcode decode attempt:
- Max width: 1200px (aspect ratio preserved)
- Output: JPEG at 80% quality
- Purpose: reduces upload size and speeds up Canvas-based preprocessing
