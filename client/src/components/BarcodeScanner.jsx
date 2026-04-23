import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BarcodeScanner() {
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState('');
  const fileRef = useRef();
  const previewUrlRef = useRef(null);
  const navigate = useNavigate();

  // Clean up object URL on unmount or when preview changes
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  async function compressImage(file, maxWidth = 1200, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, maxWidth / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve({
                file: new File([blob], file.name, { type: 'image/jpeg' }),
                canvas
              });
            } else {
              reject(new Error('Compression failed'));
            }
          }, 'image/jpeg', quality);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Produce 4 preprocessed canvas variants for improved barcode recognition
  function preprocessImage(sourceCanvas) {
    const CONTRAST_FACTOR = 1.5;
    const BINARIZE_BLOCK_SIZE = 15;
    const BINARIZE_OFFSET = 10;
    const SHARPEN_CENTER = 5;
    const SHARPEN_CARDINAL = -1;

    const w = sourceCanvas.width;
    const h = sourceCanvas.height;
    const srcCtx = sourceCanvas.getContext('2d');
    const srcData = srcCtx.getImageData(0, 0, w, h);
    const variants = [];

    // Variant 0: Original (no extra processing)
    const origCanvas = document.createElement('canvas');
    origCanvas.width = w;
    origCanvas.height = h;
    origCanvas.getContext('2d').drawImage(sourceCanvas, 0, 0);
    variants.push(origCanvas);

    // Helper: extract grayscale array from RGBA ImageData
    function toGrayscale(imgData) {
      const pixels = imgData.data;
      const gray = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) {
        const idx = i * 4;
        gray[i] = Math.round(0.299 * pixels[idx] + 0.587 * pixels[idx + 1] + 0.114 * pixels[idx + 2]);
      }
      return gray;
    }

    // Helper: write grayscale array into a new canvas
    function grayToCanvas(gray) {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      const imgData = ctx.createImageData(w, h);
      const d = imgData.data;
      for (let i = 0; i < w * h; i++) {
        const idx = i * 4;
        d[idx] = d[idx + 1] = d[idx + 2] = gray[i];
        d[idx + 3] = 255;
      }
      ctx.putImageData(imgData, 0, 0);
      return canvas;
    }

    const gray = toGrayscale(srcData);

    // Variant 1: Grayscale + Contrast (linear stretch)
    {
      const contrast = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) {
        let v = gray[i];
        v = Math.round((v - 128) * CONTRAST_FACTOR + 128);
        contrast[i] = Math.max(0, Math.min(255, v));
      }
      variants.push(grayToCanvas(contrast));
    }

    // Variant 2: Adaptive Binarization using integral image (summed-area table)
    {
      const halfSize = (BINARIZE_BLOCK_SIZE - 1) >> 1;
      // Build integral image with 1-pixel padding (row 0 and col 0 are zeros)
      const stride = w + 1;
      const integral = new Float64Array((h + 1) * stride);
      for (let y = 1; y <= h; y++) {
        for (let x = 1; x <= w; x++) {
          integral[y * stride + x] =
            gray[(y - 1) * w + (x - 1)] +
            integral[(y - 1) * stride + x] +
            integral[y * stride + (x - 1)] -
            integral[(y - 1) * stride + (x - 1)];
        }
      }

      const bin = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        const yTop = Math.max(0, y - halfSize);
        const yBot = Math.min(h - 1, y + halfSize);
        const r1 = yTop;
        const r2 = yBot + 1;
        for (let x = 0; x < w; x++) {
          const xLeft = Math.max(0, x - halfSize);
          const xRight = Math.min(w - 1, x + halfSize);
          const c1 = xLeft;
          const c2 = xRight + 1;
          const count = (yBot - yTop + 1) * (xRight - xLeft + 1);
          const sum =
            integral[r2 * stride + c2] -
            integral[r1 * stride + c2] -
            integral[r2 * stride + c1] +
            integral[r1 * stride + c1];
          const mean = sum / count;
          bin[y * w + x] = gray[y * w + x] < (mean - BINARIZE_OFFSET) ? 0 : 255;
        }
      }
      variants.push(grayToCanvas(bin));
    }

    // Variant 3: Sharpen (3x3 sharpening kernel: center=5, cardinal=-1, corners=0)
    {
      const sharp = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let val = gray[y * w + x] * SHARPEN_CENTER;
          // Cardinal neighbors with edge clamping
          const top    = y > 0        ? gray[(y - 1) * w + x] : gray[y * w + x];
          const bottom = y < h - 1    ? gray[(y + 1) * w + x] : gray[y * w + x];
          const left   = x > 0        ? gray[y * w + (x - 1)] : gray[y * w + x];
          const right  = x < w - 1    ? gray[y * w + (x + 1)] : gray[y * w + x];
          val += SHARPEN_CARDINAL * (top + bottom + left + right);
          sharp[y * w + x] = Math.max(0, Math.min(255, val));
        }
      }
      variants.push(grayToCanvas(sharp));
    }

    return variants;
  }

  // Try to decode a barcode from a single canvas using BarcodeDetector then ZXing
  async function tryDecodeFromCanvas(canvas, detector) {
    // Try native BarcodeDetector (fast, no timeout needed)
    if (detector) {
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      const img = await createImageBitmap(blob);
      try {
        const results = await detector.detect(img);
        if (results.length > 0) {
          img.close();
          return { code: results[0].rawValue, method: 'Browser-BarcodeDetector', confidence: 0.97 };
        }
      } catch (e) {
        console.debug('[BarcodeScanner] decoder failed:', e.message);
      }
      img.close();
    }

    // Fallback: ZXing via data URL (slower, wrap in 3-second timeout)
    try {
      const zxingResult = await Promise.race([
        (async () => {
          const { BrowserMultiFormatReader } = await import('@zxing/library');
          const reader = new BrowserMultiFormatReader();
          const dataUrl = canvas.toDataURL('image/png');
          const result = await reader.decodeFromImageUrl(dataUrl);
          return result;
        })(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('ZXing decode timed out')), 3000)
        )
      ]);
      return { code: zxingResult.getText(), method: 'ZXing-WASM', confidence: 0.95 };
    } catch (e) {
      console.debug('[BarcodeScanner] decoder failed:', e.message);
    }

    return null;
  }

  async function decodeBarcode(file, detector) {
    setStatus('Decoding barcode...');
    const { canvas } = await compressImage(file);
    const variants = preprocessImage(canvas);

    for (let i = 0; i < variants.length; i++) {
      if (i > 0) setStatus('Enhancing image...');
      const result = await tryDecodeFromCanvas(variants[i], detector);
      if (result) {
        setStatus(`Barcode found: ${result.code}`);
        return result;
      }
    }

    throw new Error('Unable to read barcode from image');
  }

  // Try to decode a barcode from a base64-encoded PNG image
  // Used when the server YOLO pipeline provides cropped barcode regions
  async function tryDecodeFromBase64(base64String, detector) {
    const dataUrl = `data:image/png;base64,${base64String}`;

    // Try BarcodeDetector
    if (detector) {
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        const img = await createImageBitmap(blob);
        try {
          const results = await detector.detect(img);
          if (results.length > 0) {
            return { code: results[0].rawValue, method: 'YOLO-BarcodeDetector', confidence: 0.90 };
          }
        } finally {
          img.close();
        }
      } catch (e) {
        console.debug('[BarcodeScanner] region decode failed:', e.message);
      }
    }

    // Try ZXing
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/library');
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(dataUrl);
      return { code: result.getText(), method: 'YOLO-ZXing', confidence: 0.85 };
    } catch (e) {
      console.debug('[BarcodeScanner] region ZXing decode failed:', e.message);
    }

    return null;
  }

  // Fire-and-forget YOLO enrichment after a successful client-side decode.
  // Merges YOLO detection data into the scan results already shown to the user.
  function yoloEnrichSuccess(file, scanData) {
    (async () => {
      try {
        setStatus('Analyzing product category...');
        const formData = new FormData();
        formData.append('image', file); // original file, not compressed

        const yoloRes = await fetch('/api/scan-barcode', {
          method: 'POST',
          body: formData
        });

        if (yoloRes.ok) {
          const yoloData = await yoloRes.json();
          if (yoloData.yoloDetection) {
            scanData.yoloDetection = yoloData.yoloDetection;
          }
        }
      } catch (e) {
        console.debug('[BarcodeScanner] YOLO enrichment failed:', e.message);
        // Non-critical, do not fail the scan
      }
    })();
  }

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreview(url);
    setScanning(true);
    setStatus('Decoding barcode...');

    // Create BarcodeDetector once for reuse in client decode and YOLO region decode
    let sharedDetector = null;
    try {
      if ('BarcodeDetector' in window) {
        sharedDetector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] });
      }
    } catch (e) {
      console.debug('[BarcodeScanner] BarcodeDetector init failed:', e.message);
    }

    try {
      // Step 1: Try client-side decoding (existing fast path)
      let decoded = null;
      try {
        decoded = await decodeBarcode(file, sharedDetector);
      } catch (decodeErr) {
        // Client decode failed, will try YOLO fallback below
      }

      if (decoded) {
        // Client decode succeeded -- look up barcode, navigate, then enrich with YOLO
        setStatus('Fetching product data...');
        const res = await fetch('/api/lookup-barcode', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ barcode: decoded.code, detectionMethod: decoded.method })
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Server error');
        }

        const data = await res.json();
        // Merge client detection info without overwriting server-computed confidence
        data.barcode = {
          ...data.barcode,
          detectionMethod: decoded.method,
          clientConfidence: decoded.confidence
        };

        // Navigate immediately, then fire-and-forget YOLO enrichment
        navigate('/results', { state: { scanData: data } });
        yoloEnrichSuccess(file, data);
        return;
      }

      // Step 2: Client decode failed -- try server YOLO fallback (blocking)
      setStatus('Analyzing with AI...');
      const formData = new FormData();
      formData.append('image', file);

      const yoloRes = await fetch('/api/scan-barcode', {
        method: 'POST',
        body: formData
      });

      if (yoloRes.ok) {
        const yoloData = await yoloRes.json();
        let barcodeFound = false;

        // Try decoding barcode from YOLO-provided regions
        if (yoloData.barcodeRegions && yoloData.barcodeRegions.length > 0) {
          for (const region of yoloData.barcodeRegions) {
            const regionResult = await tryDecodeFromBase64(region.base64, sharedDetector);
            if (regionResult) {
              setStatus(`AI-enhanced barcode found: ${regionResult.code}`);

              // Use existing lookup logic with the decoded barcode
              const lookupRes = await fetch('/api/lookup-barcode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ barcode: regionResult.code, detectionMethod: regionResult.method })
              });

              if (lookupRes.ok) {
                const lookupData = await lookupRes.json();
                lookupData.barcode = {
                  ...lookupData.barcode,
                  detectionMethod: regionResult.method,
                  clientConfidence: regionResult.confidence
                };
                if (yoloData.yoloDetection) {
                  lookupData.yoloDetection = yoloData.yoloDetection;
                }
                navigate('/results', { state: { scanData: lookupData } });
                barcodeFound = true;
                break;
              }
            }
          }
        }

        // If still no barcode but YOLO found a category, show that info
        if (yoloData.yoloDetection && !barcodeFound) {
          setStatus(
            `Product detected: ${yoloData.yoloDetection.category} ` +
            `(${Math.round(yoloData.yoloDetection.confidence * 100)}% confidence). ` +
            `Enter barcode manually.`
          );
          return;
        }

        if (barcodeFound) {
          return;
        }
      }

      // Nothing worked
      setStatus('Unable to read barcode from image. Try a clearer photo.');
    } catch (err) {
      setStatus(err.message || 'Scan failed');
    } finally {
      setScanning(false);
    }
  }

  function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]);
  }

  return (
    <div className="scanner">
      <div
        className={`upload-area ${preview ? 'has-preview' : ''}`}
        onClick={() => !scanning && fileRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('dragover'); }}
        onDragLeave={(e) => e.currentTarget.classList.remove('dragover')}
        onDrop={handleDrop}
      >
        {preview ? (
          <img src={preview} alt="Preview" className="preview-img" />
        ) : (
          <>
            <div className="upload-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
            </div>
            <h3>Upload barcode image</h3>
            <p className="text-muted">Drag and drop or click to select -- JPG/PNG</p>
          </>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])} />
      </div>

      {scanning && (
        <div className="scanner-status">
          <div className="spinner"></div>
          <p>{status}</p>
        </div>
      )}

      {status && !scanning && (
        <div className="scanner-status">
          <p>{status}</p>
          <button className="btn-secondary" onClick={() => { setStatus(''); setPreview(null); }}>Try Again</button>
        </div>
      )}

      <div className="scanner-retailers">
        <span className="retailer-badge">Woolworths</span>
        <span className="retailer-badge">Coles</span>
        <span className="retailer-badge">ALDI</span>
        <span className="retailer-badge">IGA</span>
      </div>
    </div>
  );
}
