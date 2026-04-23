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
            if (blob) resolve(new File([blob], file.name, { type: 'image/jpeg' }));
            else reject(new Error('Compression failed'));
          }, 'image/jpeg', quality);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // Convert a File/Blob to an HTMLCanvasElement
  async function canvasFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);
          resolve(canvas);
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

    // Variant 1: Grayscale + Contrast (linear stretch factor 1.5)
    {
      const contrast = new Uint8Array(w * h);
      for (let i = 0; i < w * h; i++) {
        let v = gray[i];
        v = Math.round((v - 128) * 1.5 + 128);
        contrast[i] = Math.max(0, Math.min(255, v));
      }
      variants.push(grayToCanvas(contrast));
    }

    // Variant 2: Adaptive Binarization (15x15 block, threshold = localMean - 10)
    {
      const bin = new Uint8Array(w * h);
      const halfSize = 7; // (15-1)/2
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let sum = 0;
          let count = 0;
          for (let dy = -halfSize; dy <= halfSize; dy++) {
            for (let dx = -halfSize; dx <= halfSize; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
                sum += gray[ny * w + nx];
                count++;
              }
            }
          }
          const mean = sum / count;
          bin[y * w + x] = gray[y * w + x] < (mean - 10) ? 0 : 255;
        }
      }
      variants.push(grayToCanvas(bin));
    }

    // Variant 3: Sharpen (3x3 unsharp mask: center=5, cardinal=-1, corners=0)
    {
      const sharp = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let val = gray[y * w + x] * 5;
          // Cardinal neighbors with edge clamping
          const top    = y > 0        ? gray[(y - 1) * w + x] : gray[y * w + x];
          const bottom = y < h - 1    ? gray[(y + 1) * w + x] : gray[y * w + x];
          const left   = x > 0        ? gray[y * w + (x - 1)] : gray[y * w + x];
          const right  = x < w - 1    ? gray[y * w + (x + 1)] : gray[y * w + x];
          val -= top + bottom + left + right;
          sharp[y * w + x] = Math.max(0, Math.min(255, val));
        }
      }
      variants.push(grayToCanvas(sharp));
    }

    return variants;
  }

  // Try to decode a barcode from a single canvas using BarcodeDetector then ZXing
  async function tryDecodeFromCanvas(canvas) {
    // Try native BarcodeDetector
    if ('BarcodeDetector' in window) {
      const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] });
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      const img = await createImageBitmap(blob);
      try {
        const results = await detector.detect(img);
        if (results.length > 0) {
          img.close();
          return { code: results[0].rawValue, method: 'Browser-BarcodeDetector', confidence: 0.97 };
        }
      } catch {}
      img.close();
    }

    // Fallback: ZXing via data URL
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/library');
      const reader = new BrowserMultiFormatReader();
      const dataUrl = canvas.toDataURL('image/png');
      const result = await reader.decodeFromImageUrl(dataUrl);
      return { code: result.getText(), method: 'ZXing-WASM', confidence: 0.95 };
    } catch {}

    return null;
  }

  async function decodeBarcode(file) {
    setStatus('Decoding barcode...');
    const compressed = await compressImage(file);
    const canvas = await canvasFromFile(compressed);
    const variants = preprocessImage(canvas);

    for (let i = 0; i < variants.length; i++) {
      if (i > 0) setStatus('Enhancing image...');
      const result = await tryDecodeFromCanvas(variants[i]);
      if (result) {
        setStatus(`Barcode found: ${result.code}`);
        return result;
      }
    }

    throw new Error('Unable to read barcode from image');
  }

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const url = URL.createObjectURL(file);
    previewUrlRef.current = url;
    setPreview(url);
    setScanning(true);
    setStatus('Decoding barcode...');

    try {
      const decoded = await decodeBarcode(file);

      // Call backend API
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
      navigate('/results', { state: { scanData: data } });
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
