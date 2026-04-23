'use strict';

const sharp = require('sharp');
const ort = require('onnxruntime-node');

const MODEL_SIZE = 640;
const PAD_GRAY = 128;

/**
 * Prepare an image buffer for YOLO inference.
 *
 * Steps:
 *  1. Read original dimensions via sharp metadata.
 *  2. Resize so the longest side is 640, maintaining aspect ratio (fit: 'inside').
 *  3. Create a 640x640 gray (128,128,128) canvas and composite the resized image
 *     centered on it (letterbox padding).
 *  4. Extract raw RGB pixel data as a Buffer.
 *  5. Convert to Float32, normalize to [0, 1].
 *  6. Rearrange from HWC (640, 640, 3) to NCHW (1, 3, 640, 640).
 *  7. Return an ort.Tensor plus coordinate-mapping metadata.
 *
 * @param {Buffer} imageBuffer - Raw image buffer (JPEG/PNG from multer)
 * @returns {Promise<{tensor: ort.Tensor, meta: {origWidth: number, origHeight: number, scale: number, padX: number, padY: number}}>}
 */
async function prepareForYolo(imageBuffer) {
  // 1. Get original dimensions
  const metadata = await sharp(imageBuffer).metadata();
  const origWidth = metadata.width;
  const origHeight = metadata.height;

  // 2. Compute resize scale and new dimensions
  const longestSide = Math.max(origWidth, origHeight);
  const scale = MODEL_SIZE / longestSide;
  const resizedWidth = Math.round(origWidth * scale);
  const resizedHeight = Math.round(origHeight * scale);

  // 3. Resize the image to fit within 640x640, maintaining aspect ratio
  const resizedBuffer = await sharp(imageBuffer)
    .resize(resizedWidth, resizedHeight, { fit: 'inside' })
    .removeAlpha()
    .raw()
    .toBuffer();

  // 4. Create the letterboxed canvas and composite the resized image centered
  const padX = Math.floor((MODEL_SIZE - resizedWidth) / 2);
  const padY = Math.floor((MODEL_SIZE - resizedHeight) / 2);

  const canvasBuffer = Buffer.alloc(MODEL_SIZE * MODEL_SIZE * 3, PAD_GRAY);

  // Copy resized pixels onto the center of the gray canvas
  for (let y = 0; y < resizedHeight; y++) {
    const srcOffset = y * resizedWidth * 3;
    const dstOffset = ((padY + y) * MODEL_SIZE + padX) * 3;
    resizedBuffer.copy(canvasBuffer, dstOffset, srcOffset, srcOffset + resizedWidth * 3);
  }

  // 5. Convert HWC uint8 to NCHW float32 normalized [0, 1]
  const totalPixels = MODEL_SIZE * MODEL_SIZE;
  const nchw = new Float32Array(3 * totalPixels);

  for (let y = 0; y < MODEL_SIZE; y++) {
    for (let x = 0; x < MODEL_SIZE; x++) {
      const hwcIdx = (y * MODEL_SIZE + x) * 3;
      const spatialIdx = y * MODEL_SIZE + x;
      nchw[0 * totalPixels + spatialIdx] = canvasBuffer[hwcIdx] / 255.0;     // R
      nchw[1 * totalPixels + spatialIdx] = canvasBuffer[hwcIdx + 1] / 255.0; // G
      nchw[2 * totalPixels + spatialIdx] = canvasBuffer[hwcIdx + 2] / 255.0; // B
    }
  }

  // 6. Create ort.Tensor with dims [1, 3, 640, 640]
  const tensor = new ort.Tensor('float32', nchw, [1, 3, MODEL_SIZE, MODEL_SIZE]);

  return {
    tensor,
    meta: {
      origWidth,
      origHeight,
      scale,
      padX,
      padY
    }
  };
}

/**
 * Crop a region from an image buffer with optional padding.
 *
 * @param {Buffer} imageBuffer - Raw image buffer (JPEG/PNG)
 * @param {{ x: number, y: number, w: number, h: number }} bbox - Bounding box in original image coordinates
 * @param {number} [paddingFraction=0.2] - Fraction of bbox size to add as padding (default 20%)
 * @returns {Promise<{ base64: string, width: number, height: number }>}
 */
async function cropRegion(imageBuffer, bbox, paddingFraction = 0.2) {
  const metadata = await sharp(imageBuffer).metadata();
  const imgWidth = metadata.width;
  const imgHeight = metadata.height;

  // Compute padded region, clamped to image bounds
  const padW = Math.round(bbox.w * paddingFraction);
  const padH = Math.round(bbox.h * paddingFraction);

  const left = Math.max(0, Math.round(bbox.x - padW));
  const top = Math.max(0, Math.round(bbox.y - padH));
  const right = Math.min(imgWidth, Math.round(bbox.x + bbox.w + padW));
  const bottom = Math.min(imgHeight, Math.round(bbox.y + bbox.h + padH));

  const cropWidth = right - left;
  const cropHeight = bottom - top;

  const croppedBuffer = await sharp(imageBuffer)
    .extract({ left, top, width: cropWidth, height: cropHeight })
    .png()
    .toBuffer();

  return {
    base64: croppedBuffer.toString('base64'),
    width: cropWidth,
    height: cropHeight
  };
}

/**
 * Compute Intersection-over-Union for two bounding boxes.
 *
 * @param {{ x: number, y: number, w: number, h: number }} a
 * @param {{ x: number, y: number, w: number, h: number }} b
 * @returns {number} IoU value in [0, 1]
 */
function computeIoU(a, b) {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.w, b.x + b.w);
  const y2 = Math.min(a.y + a.h, b.y + b.h);

  const intersectionWidth = Math.max(0, x2 - x1);
  const intersectionHeight = Math.max(0, y2 - y1);
  const intersection = intersectionWidth * intersectionHeight;

  const areaA = a.w * a.h;
  const areaB = b.w * b.h;
  const union = areaA + areaB - intersection;

  if (union <= 0) return 0;
  return intersection / union;
}

/**
 * Extract barcode candidate regions from YOLO detections.
 *
 * Strategy:
 *  - For each product detection, take the bottom 30% of the bounding box
 *    (barcodes are usually at the bottom/side of products).
 *  - Also add a wider region covering the full bottom strip of the product.
 *  - De-duplicate overlapping regions (IoU > 0.5).
 *
 * @param {Array<{ x: number, y: number, w: number, h: number, label?: string, confidence?: number }>} detections - YOLO detection results in original image coordinates
 * @param {number} origWidth - Original image width
 * @param {number} origHeight - Original image height
 * @returns {Array<{ x: number, y: number, w: number, h: number }>}
 */
function extractBarcodeRegions(detections, origWidth, origHeight) {
  const candidates = [];

  for (const det of detections) {
    // Bottom 30% of the product bounding box
    const bottomRegionHeight = Math.round(det.h * 0.3);
    candidates.push({
      x: det.x,
      y: det.y + det.h - bottomRegionHeight,
      w: det.w,
      h: bottomRegionHeight
    });

    // Wider bottom region: full width of product, bottom 15%, extended
    // slightly wider than the original detection to catch barcodes at edges
    const widerPad = Math.round(det.w * 0.1);
    const widerX = Math.max(0, det.x - widerPad);
    const widerW = Math.min(origWidth, det.x + det.w + widerPad) - widerX;
    const widerRegionHeight = Math.round(det.h * 0.15);
    candidates.push({
      x: widerX,
      y: det.y + det.h - widerRegionHeight,
      w: widerW,
      h: widerRegionHeight
    });
  }

  // If no detections were provided, fall back to the bottom half of the image
  if (candidates.length === 0) {
    candidates.push({
      x: 0,
      y: Math.round(origHeight * 0.5),
      w: origWidth,
      h: Math.round(origHeight * 0.5)
    });
  }

  // Clamp all candidates to image bounds
  for (const c of candidates) {
    c.x = Math.max(0, Math.round(c.x));
    c.y = Math.max(0, Math.round(c.y));
    c.w = Math.min(origWidth - c.x, Math.round(c.w));
    c.h = Math.min(origHeight - c.y, Math.round(c.h));
  }

  // De-duplicate overlapping regions using IoU > 0.5 threshold
  const IOU_THRESHOLD = 0.5;
  const deduplicated = [];

  for (const candidate of candidates) {
    let isDuplicate = false;
    for (const existing of deduplicated) {
      if (computeIoU(candidate, existing) > IOU_THRESHOLD) {
        isDuplicate = true;
        break;
      }
    }
    if (!isDuplicate && candidate.w > 0 && candidate.h > 0) {
      deduplicated.push(candidate);
    }
  }

  return deduplicated;
}

module.exports = {
  prepareForYolo,
  cropRegion,
  extractBarcodeRegions
};
