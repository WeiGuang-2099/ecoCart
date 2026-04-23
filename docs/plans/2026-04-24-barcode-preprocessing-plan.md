# Barcode Preprocessing Implementation Plan

## Scope

Modify `client/src/components/BarcodeScanner.jsx` only. No new dependencies.

## Steps

### Step 1: Add `preprocessImage(sourceCanvas)` function

Add a function that takes a canvas and returns an array of preprocessed
canvas variants for barcode decoding.

Variants to generate:
1. **Grayscale + Contrast** -- convert to grayscale, then apply linear
   contrast stretch (factor 1.5). Pixel-by-pixel via `getImageData`.
2. **Adaptive Binarization** -- convert to grayscale, then for each pixel
   compare against the local mean of a surrounding block (e.g. 15x15).
   If pixel < mean - C (where C=10), set to 0, else 255. Handles uneven
   lighting.
3. **Sharpen** -- convert to grayscale, then apply a 3x3 sharpening kernel
   (unsharp mask: center 5, cardinal neighbors -1). Pixel-by-pixel via
   `getImageData` with edge clamping.

The original compressed canvas is also included as a variant (no extra
processing needed), so callers get 4 canvases total.

Implementation note: each variant produces a new canvas (same dimensions
as source) via `document.createElement('canvas')`.

### Step 2: Refactor `decodeBarcode(file)` for multi-pass decoding

Current flow:
```
compressImage -> BarcodeDetector -> ZXing -> fail
```

New flow:
```
compressImage -> canvasFromBlob -> preprocessImage(variants) ->
  for each variant:
    try BarcodeDetector(variant)
    if fail, try ZXing(variant)
  all fail -> throw error
```

Key change: convert the compressed file to a canvas first, then generate
preprocessing variants from it. Each variant canvas gets converted to a
Blob/File for BarcodeDetector (via `canvas.toBlob`) or a data URL for
ZXing (via `canvas.toDataURL`).

Add a helper `canvasFromFile(file)` that returns a promise resolving to
an HTMLCanvasElement.

### Step 3: Update status messages

Show which preprocessing variant is being tried, so the user sees activity:
- "Decoding barcode..."
- "Enhancing image..."  (when starting preprocessing variants)
- "Barcode found: XXXX"

### Step 4: Test

Manual test with sample barcode images:
- Clear barcode photo (should succeed on original)
- Low contrast photo (should succeed on contrast variant)
- Blurry photo (should succeed on sharpened variant)
- Uneven lighting (should succeed on binarized variant)

## File Changes Summary

| File | Change |
|------|--------|
| `client/src/components/BarcodeScanner.jsx` | Add `preprocessImage()`, add `canvasFromFile()`, modify `decodeBarcode()` |
