'use strict';

const path = require('path');
const fs = require('fs');

let _ort = null;
function getOrt() {
  if (!_ort) {
    _ort = require('onnxruntime-node');
  }
  return _ort;
}

// --- Configuration ---
const MODEL_PATH = path.join(__dirname, '../../models/yolov8n.onnx');
const CONFIDENCE_THRESHOLD = 0.5;
const NMS_IOU_THRESHOLD = 0.45;
const MAX_DETECTIONS = 10;
const INFERENCE_TIMEOUT_MS = 5000;

// Product-relevant COCO class IDs mapped to user-friendly labels
const PRODUCT_CLASSES = {
  39: 'bottle',
  41: 'cup',
  42: 'fork',
  43: 'knife',
  44: 'spoon',
  45: 'bowl',
  46: 'banana',
  47: 'apple',
  48: 'sandwich',
  49: 'orange',
  50: 'broccoli',
  51: 'carrot',
  52: 'hot dog',
  53: 'pizza',
  54: 'donut',
  55: 'cake',
  56: 'chair',
  62: 'tv',
  63: 'laptop',
  64: 'mouse',
  65: 'remote',
  66: 'keyboard',
  67: 'cell phone',
  73: 'book',
  74: 'clock',
  75: 'vase',
  76: 'scissors'
};

/**
 * Singleton YOLOv8n ONNX inference service.
 * Model loads lazily on first detect() call, then cached.
 */
class YoloDetector {
  constructor() {
    this._session = null;
    this._loading = null;
  }

  /**
   * Lazily create and cache the ONNX inference session.
   * @returns {Promise<ort.InferenceSession>}
   */
  async _ensureSession() {
    if (this._session) {
      return this._session;
    }

    // Coalesce concurrent calls into a single load
    if (this._loading) {
      return this._loading;
    }

    this._loading = this._createSession();
    try {
      this._session = await this._loading;
      return this._session;
    } finally {
      this._loading = null;
    }
  }

  /**
   * Create the ONNX inference session.
   * @returns {Promise<ort.InferenceSession>}
   */
  async _createSession() {
    if (!fs.existsSync(MODEL_PATH)) {
      throw new Error(
        `YOLO model file not found at ${MODEL_PATH}. ` +
        'Download yolov8n.onnx from https://github.com/ultralytics/assets/releases ' +
        'and place it in the models/ directory.'
      );
    }

    return getOrt().InferenceSession.create(MODEL_PATH, {
      executionProviders: ['cpu']
    });
  }

  /**
   * Run YOLOv8n detection on a preprocessed input tensor.
   *
   * @param {ort.Tensor} inputTensor - Preprocessed (1,3,640,640) float32 NCHW tensor
   * @param {Object} imageData - Original image metadata for coordinate mapping
   * @param {number} imageData.width  - Original image width
   * @param {number} imageData.height - Original image height
   * @param {number} imageData.scale  - Scale factor applied during preprocessing
   * @param {number} imageData.padX   - Horizontal padding added during preprocessing
   * @param {number} imageData.padY   - Vertical padding added during preprocessing
   * @returns {Promise<Array<{label: string, confidence: number, classId: number, bbox: {x: number, y: number, w: number, h: number}}>>}
   */
  async detect(inputTensor, imageData) {
    try {
      const session = await this._ensureSession();

      // Run inference with a timeout to avoid blocking the server
      const output = await this._runInference(session, inputTensor);

      return this._postprocess(output, imageData);
    } catch (err) {
      // If the model failed to load, re-throw so the caller can report it
      if (err.message && err.message.includes('model file not found')) {
        throw err;
      }
      // For inference failures, return empty array rather than crashing
      console.error('[yolo-detector] Inference error:', err.message);
      return [];
    }
  }

  /**
   * Run the ONNX inference with a timeout wrapper.
   * @param {ort.InferenceSession} session
   * @param {ort.Tensor} inputTensor
   * @returns {Promise<ort.Tensor>}
   */
  async _runInference(session, inputTensor) {
    const feeds = {};
    feeds[session.inputNames[0]] = inputTensor;

    const inferencePromise = session.run(feeds);

    const timeoutPromise = new Promise((_resolve, reject) => {
      setTimeout(() => {
        reject(new Error('YOLO inference timed out after 5 seconds'));
      }, INFERENCE_TIMEOUT_MS);
    });

    const results = await Promise.race([inferencePromise, timeoutPromise]);

    // Extract output tensor by name
    const outputName = session.outputNames[0];
    return results[outputName];
  }

  /**
   * Post-process YOLOv8 raw output into filtered detections.
   *
   * YOLOv8 output shape: (1, 84, N) where N is the number of predictions
   *   - Rows 0-3: cx, cy, w, h in 640x640 space
   *   - Rows 4-83: class scores (80 COCO classes)
   *
   * @param {ort.Tensor} outputTensor - Raw model output
   * @param {Object} imageData - Coordinate mapping parameters
   * @returns {Array} Filtered detections
   */
  _postprocess(outputTensor, imageData) {
    const data = outputTensor.data;
    const dims = outputTensor.dims;

    // Validate output tensor shape: expected [1, 84, N] where N > 0
    if (
      !dims || dims.length !== 3 ||
      dims[0] !== 1 || dims[1] !== 84 || dims[2] <= 0
    ) {
      console.warn(
        `[yolo-detector] Unexpected output tensor shape: ${dims ? JSON.stringify(dims) : 'undefined'}. ` +
        'Expected [1, 84, N] where N > 0. Returning empty detections.'
      );
      return [];
    }

    const numClasses = 80;
    const numPredictions = dims[2]; // Derive from actual dims, not hardcoded

    // Step a: Collect all valid detections
    const candidates = [];

    for (let i = 0; i < numPredictions; i++) {
      // Read cx, cy, w, h from the transposed layout
      // In (1, 84, 8400) layout: data[0*8400 + i], data[1*8400 + i], etc.
      const cx = data[0 * numPredictions + i];
      const cy = data[1 * numPredictions + i];
      const w = data[2 * numPredictions + i];
      const h = data[3 * numPredictions + i];

      // Step b: Find max class score and corresponding class id
      let maxScore = -1;
      let maxClassId = -1;
      for (let c = 0; c < numClasses; c++) {
        const score = data[(4 + c) * numPredictions + i];
        if (score > maxScore) {
          maxScore = score;
          maxClassId = c;
        }
      }

      // Step c: Filter by confidence threshold
      if (maxScore < CONFIDENCE_THRESHOLD) {
        continue;
      }

      // Only keep product-relevant classes
      if (!(maxClassId in PRODUCT_CLASSES)) {
        continue;
      }

      // Step d: Map coordinates back to original image space
      const { scale, padX, padY } = imageData;
      const origCx = (cx - padX) / scale;
      const origCy = (cy - padY) / scale;
      const origW = w / scale;
      const origH = h / scale;

      // Convert center format to corner format (x, y from top-left)
      const bbox = {
        x: origCx - origW / 2,
        y: origCy - origH / 2,
        w: origW,
        h: origH
      };

      candidates.push({
        label: PRODUCT_CLASSES[maxClassId],
        confidence: maxScore,
        classId: maxClassId,
        bbox
      });
    }

    // Step e: Non-Maximum Suppression (NMS)
    const kept = this._nms(candidates);

    // Step f: Return top detections (max 10)
    return kept.slice(0, MAX_DETECTIONS);
  }

  /**
   * Apply Non-Maximum Suppression.
   * Sort by confidence descending, then suppress overlapping boxes.
   *
   * @param {Array} detections - Candidate detections
   * @returns {Array} Filtered detections after NMS
   */
  _nms(detections) {
    // Sort by confidence descending
    const sorted = detections.slice().sort((a, b) => b.confidence - a.confidence);
    const kept = [];
    const suppressed = new Set();

    for (let i = 0; i < sorted.length; i++) {
      if (suppressed.has(i)) {
        continue;
      }

      kept.push(sorted[i]);

      // Suppress all lower-confidence detections with high IoU
      for (let j = i + 1; j < sorted.length; j++) {
        if (suppressed.has(j)) {
          continue;
        }

        const iou = this._computeIoU(sorted[i].bbox, sorted[j].bbox);
        if (iou > NMS_IOU_THRESHOLD) {
          suppressed.add(j);
        }
      }
    }

    return kept;
  }

  /**
   * Compute Intersection over Union of two bounding boxes.
   *
   * @param {Object} a - First bbox { x, y, w, h }
   * @param {Object} b - Second bbox { x, y, w, h }
   * @returns {number} IoU value in [0, 1]
   */
  _computeIoU(a, b) {
    const aX1 = a.x;
    const aY1 = a.y;
    const aX2 = a.x + a.w;
    const aY2 = a.y + a.h;

    const bX1 = b.x;
    const bY1 = b.y;
    const bX2 = b.x + b.w;
    const bY2 = b.y + b.h;

    const interX1 = Math.max(aX1, bX1);
    const interY1 = Math.max(aY1, bY1);
    const interX2 = Math.min(aX2, bX2);
    const interY2 = Math.min(aY2, bY2);

    const interW = Math.max(0, interX2 - interX1);
    const interH = Math.max(0, interY2 - interY1);
    const interArea = interW * interH;

    const aArea = a.w * a.h;
    const bArea = b.w * b.h;
    const unionArea = aArea + bArea - interArea;

    if (unionArea <= 0) {
      return 0;
    }

    return interArea / unionArea;
  }

  /**
   * Release the ONNX session for graceful shutdown.
   */
  close() {
    if (this._session) {
      this._session.release();
      this._session = null;
    }
  }
}

// Export a singleton instance
module.exports = new YoloDetector();
