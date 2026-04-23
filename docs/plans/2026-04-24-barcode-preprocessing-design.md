# Barcode Preprocessing Design

## Goal

Improve barcode recognition success rate in the EcoCart client by adding
client-side image preprocessing before decoding. No new dependencies.

## Current State

- BarcodeScanner.jsx decodes via native BarcodeDetector API then @zxing/library
- Only a single compressed image is tried
- No image preprocessing (grayscale, contrast, sharpening, binarization)

## Design

### Preprocessing Pipeline

`preprocessImage(sourceCanvas)` generates 4 image variants via Canvas 2D
pixel operations:

1. **Original** (already compressed by existing `compressImage`)
2. **Grayscale + Contrast** -- grayscale + linear contrast stretch (1.5x)
3. **Adaptive Binarization** -- grayscale + local threshold binarization
   (handles uneven lighting)
4. **Sharpen** -- grayscale + unsharp mask (handles slight blur)

### Decoding Strategy

For each variant (in order):
1. Try BarcodeDetector API (fast, native)
2. If fails, try @zxing/library (WASM, slower but broader format support)
3. If succeeds, return immediately
4. If all variants fail, report error to user

### Changes

Single file modified: `client/src/components/BarcodeScanner.jsx`

- Add `preprocessImage(sourceCanvas)` returning `HTMLCanvasElement[]`
- Modify `decodeBarcode(file)` to iterate variants
- Existing `compressImage` and API call logic unchanged

### Performance

- 4 variants x 2 decoders = max 8 decode attempts
- Canvas pixel ops on 1200px-wide image: ~5-15ms each
- BarcodeDetector: ~10-50ms per attempt
- ZXing: ~50-200ms per attempt
- Worst case total: ~1-2 seconds

### Out of Scope

- Server-side processing or fallback
- Live camera scanning
- YOLO/object detection
- New npm dependencies
