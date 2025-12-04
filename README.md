# EcoCart - Supermarket Carbon Footprint Scanner

EcoCart is a privacy-first web app that lets Australian shoppers scan product barcodes, estimate cradle-to-shelf carbon emissions, and discover local eco-friendly alternatives.

## Features
1. **Browser barcode decoding** powered by the native `BarcodeDetector` API with ZXing WASM fallback.
2. **Environmental claim checks** against ACCC anti-greenwashing guidance.
3. **Australian carbon model** using AFSIS classifications, ANZ LCA emission factors, and National Freight Data Hub logistics assumptions.
4. **Local store recommendations** to highlight zero-waste shops and refill stations near the user.

## Tech Stack
- **Backend:** Node.js + Express
- **Frontend:** HTML5 + Bootstrap 5 + vanilla JavaScript
- **Image processing:** Jimp (server) + Canvas APIs (client)

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

## API Overview

### `POST /api/scan-barcode`
Accepts an image upload and returns detected barcode info, carbon footprint, eco-claims, and alternatives.

### `POST /api/lookup-barcode`
Accepts a JSON payload with `{ "barcode": "9330777000015" }` when the browser already decoded the code, returning the same payload without uploading the image again.

### `POST /api/local-alternatives`
Provide `{ productCategory, userLocation: { lat, lng } }` to fetch nearby refill or organic stores plus comparison metrics.

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
