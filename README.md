# EcoCart - Supermarket Carbon Footprint Scanner

EcoCart is a privacy-first web app that lets Australian shoppers scan product barcodes, estimate cradle-to-shelf carbon emissions, and discover local eco-friendly alternatives.

## Features
1. **Browser barcode decoding**: native `BarcodeDetector` with ZXing WASM fallback (no image leaves the browser).
2. **ACCC greenwashing checks**: flags vague or certification-required sustainability claims.
3. **Australian carbon model**: AFSIS product categories, ANZ LCA emission factors, National Freight Data Hub distances, NGA transport factors, and perishable air-freight adjustment.
4. **Local eco alternatives**: nearby refill/organic/zero-waste stores plus suggested substitutions.
5. **Privacy-first processing**: images handled in memory; fallback cloud calls disabled by default.

## Tech Stack
- **Backend:** Node.js + Express
- **Frontend:** HTML5 + Bootstrap 5 + vanilla JavaScript
- **Image processing:** Jimp (server) + Canvas APIs (client)

## Required Dependencies
- express, cors, multer, dotenv
- axios (for optional network calls)
- sharp and jimp (image preprocessing on the server)
- @zxing/library and @zxing/browser (client-side barcode decoding)
- tesseract.js (OCR fallback if enabled)
- bootstrap and bootstrap-icons (UI)

## Architecture
- **public/index.html**: Single-page UI; decodes barcodes in-browser, then calls `/api/lookup-barcode`.
- **server.js**: Express API, carbon model computation (production + transport + packaging), compliance headers.
- **data/australian-products.json**: Product catalog with AFSIS categories, origin locations, weights, emission factors, and logistics inputs.
- **accc-compliance.js**: ACCC anti-greenwashing rules and recommendations.
- **local-alternatives-map.js**: Local store recommendations and map snippet generator.
- **yolo-nas-barcode.js**: Simulated barcode/OCR logic (browser decoding is primary).

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Create or update `.env` with your OpenAI key (only used if you re-enable cloud fallbacks) and port:
```
OPENAI_API_KEY=your_openai_key
PORT=5000
```

### 3. Run the server
```bash
npm start
```

Visit `http://localhost:5000` and upload a photo of a supermarket barcode.

## Scripts
- `npm start` — start the Express server.
- `npm run dev` — start with nodemon (auto-restart on changes).

## API Overview

### `POST /api/scan-barcode`
Accepts an image upload and returns detected barcode info, carbon footprint, eco-claims, and alternatives.

### `POST /api/lookup-barcode`
Accepts a JSON payload with `{ "barcode": "9330777000015" }` when the browser already decoded the code, returning the same payload without uploading the image again.

### `POST /api/local-alternatives`
Provide `{ productCategory, userLocation: { lat, lng } }` to fetch nearby refill or organic stores plus comparison metrics.

## Carbon Model (Summary)
- **Total = PRODUCTION + TRANSPORT + PACKAGING**
- **Production**: `weight_kg * emission_factor` (ANZ LCA v3.1)
- **Transport**: `(weight_kg / 1000) * distance_km * transport_factor * adjustment_factor`
  - transport_factor (NGA Table 5.2): air 0.84, sea 0.02, road_truck 0.096, rail 0.025 kg CO2e/tonne-km
  - adjustment_factor: 5.5 if fresh food AND air; otherwise 1.0 (NGA Section 4.3.2)
- **Packaging**: fixed 0.05 kg CO2e (Australian Packaging Covenant Standard v2.1)
- Defaults: category-based weight and emission factors from AFSIS/ANZ LCA when product data is missing; marked as “Estimated value.”

## Data Sources
- AFSIS barcode/category mapping (for product_category and origin_location)
- ANZ LCA Database v3.1 (emission factors, default weights)
- National Freight Data Hub (distance assumptions)
- NGA Table 5.2 (transport factors)
- Australian Packaging Covenant Standard v2.1 (packaging factor)

## Privacy
- Images processed in-memory; no persistent storage.
- Location used only with user consent for local alternatives.
- Compliance headers set for Privacy Act 1988.

## Project Structure
```
ecoCart/
|-- server.js                 # Express server and API routes
|-- public/index.html         # Single-page UI
|-- data/australian-products.json  # Product + carbon model metadata
|-- data/australian-keywords.json  # OCR keyword heuristics
|-- accc-compliance.js        # ACCC greenwashing checker
|-- local-alternatives-map.js # Local store lookup + map HTML
`-- README.md
```

## Contributing
Pull requests and bug reports are welcome! Please run tests (if applicable) and describe any data-source updates clearly.

## License
MIT
