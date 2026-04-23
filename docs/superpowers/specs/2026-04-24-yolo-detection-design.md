# YOLO Real Detection Design

## Overview

Replace the deleted simulated YOLO-NAS module with real YOLO object detection using YOLOv8s ONNX model running on Node.js backend via onnxruntime-node, combined with OpenCV traditional CV for barcode localization.

## Requirements

- Real YOLO inference for product category recognition (COCO classes)
- OpenCV-based barcode region localization (gradient + contour detection)
- ZXing barcode decoding on localized regions
- All processing server-side in Node.js (no Python dependency)
- Graceful degradation when components fail

## Architecture

```
User uploads image
    |
    v
[Express POST /api/scan-barcode]
    |
    +-- 1. multer receives image
    |
    +-- 2. OpenCV barcode localization
    |       grayscale -> gaussian blur -> Sobel X gradient -> Otsu threshold
    |       -> morphological closing -> contour detection
    |       -> filter by aspect ratio (>1.5) and minimum area
    |       -> crop barcode candidate regions
    |
    +-- 3. YOLOv8s ONNX inference (onnxruntime-node)
    |       input: 640x640 RGB, normalized [0,1], NCHW
    |       output: (1, 84, 8400) -> NMS post-processing
    |       filter COCO product classes
    |
    +-- 4. ZXing barcode decoding
    |       try each cropped barcode candidate region
    |       fallback: try full original image
    |
    +-- 5. Open Food Facts API lookup
    |
    v
Return: { barcode, productName, category, carbonData, boundingBoxes, detectionMethod }
```

## File Structure (New Files)

```
server/
  services/
    yolo-detector.js        # YOLOv8s ONNX inference (singleton, loads on first request)
    barcode-localizer.js    # OpenCV barcode region localization
  utils/
    image-preprocess.js     # Image resize, normalize for ONNX input
models/
  yolov8s.onnx              # YOLOv8s ONNX model (~22MB, not in git)
```

## Dependencies

| Package | Purpose | Approximate Size |
|---------|---------|-----------------|
| `onnxruntime-node` | ONNX inference engine with native bindings | ~50MB |
| `@techstark/opencv-js` | OpenCV for barcode localization via traditional CV | ~8MB |
| `jimp` | Image crop/resize/format conversion | ~2MB |

## YOLO Detector Service (yolo-detector.js)

- Singleton pattern: model loaded once, stays in memory
- Input: 640x640 RGB image tensor, normalized to [0,1], NCHW layout
- Output: YOLOv8 raw tensor (1, 84, 8400) requiring post-processing
- Post-processing: NMS (IoU threshold=0.45, confidence threshold=0.5)
- Relevant COCO classes mapped to product categories:
  - bottle(39), cup(41), fork(42), knife(43), spoon(44), bowl(45)
  - banana(46), apple(47), sandwich(48), orange(49)
  - broccoli(50), carrot(51), pizza(54), donut(55), cake(56)
  - chair(56), TV(62), laptop(63), mouse(64), keyboard(66), cell phone(67)
- Lazy loading: model loaded on first inference request, then cached

## Barcode Localizer (barcode-localizer.js)

- Algorithm: grayscale -> gaussian blur -> Sobel X gradient -> Otsu threshold -> morphological closing -> contour detection
- Filtering criteria: aspect ratio > 1.5 (barcodes are wide/flat), minimum area threshold
- Output: list of bounding box coordinates for barcode candidate regions
- Falls back to full image if no candidates found

## API Changes

Modify existing `POST /api/scan-barcode` route in `server/routes/barcode.js`:

Before: multer -> direct ZXing decode
After:  multer -> OpenCV localization -> YOLO recognition -> ZXing decode -> OFF lookup

### Response Schema (new fields)

```json
{
  "barcode": "9300675030014",
  "productCategory": "bottle",
  "confidence": 0.87,
  "detectionMethod": "YOLOv8s+OpenCV",
  "boundingBoxes": {
    "barcode": { "x": 120, "y": 80, "w": 200, "h": 60 },
    "product": { "x": 50, "y": 30, "w": 400, "h": 350 }
  }
}
```

## Degradation Strategy

Priority chain when components fail:

1. OpenCV localization + YOLO recognition + ZXing decoding (best case)
2. YOLO recognition + ZXing on full image (localization failed)
3. YOLO category only + prompt user to enter barcode manually (decoding failed)
4. Return error, ask user to retake photo (everything failed)

## Performance

- Model lazy loading on first request
- Inference timeout: 5 seconds
- Image size limit: 10MB (enforced by multer)
- Estimated YOLOv8s ONNX CPU inference: 100-300ms per image

## Testing

- Unit tests for yolo-detector.js post-processing logic
- Unit tests for barcode-localizer.js localization logic
- Integration tests for full scan-barcode API with test images
- Test fixtures: 3-5 product photos with visible barcodes

## Model Acquisition

- Download YOLOv8s ONNX from Ultralytics: `yolo export model=yolov8s.pt format=onnx`
- Or use pre-exported ONNX from ultralytics GitHub releases
- Place at `models/yolov8s.onnx` (excluded from git via .gitignore)
- Document download/setup in README or setup script
