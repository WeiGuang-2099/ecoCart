import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function BarcodeScanner() {
  const [preview, setPreview] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [status, setStatus] = useState('');
  const fileRef = useRef();
  const navigate = useNavigate();

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

  async function decodeBarcode(file) {
    // Try native BarcodeDetector
    if ('BarcodeDetector' in window) {
      const detector = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39'] });
      const img = await createImageBitmap(file);
      try {
        const results = await detector.detect(img);
        if (results.length > 0) {
          img.close();
          return { code: results[0].rawValue, method: 'Browser-BarcodeDetector', confidence: 0.97 };
        }
      } catch {}
      img.close();
    }

    // Fallback: ZXing
    try {
      const { BrowserMultiFormatReader } = await import('@zxing/library');
      const reader = new BrowserMultiFormatReader();
      const url = URL.createObjectURL(file);
      const result = await reader.decodeFromImageUrl(url);
      URL.revokeObjectURL(url);
      return { code: result.getText(), method: 'ZXing-WASM', confidence: 0.95 };
    } catch {}

    throw new Error('Unable to read barcode from image');
  }

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) return;

    setPreview(URL.createObjectURL(file));
    setScanning(true);
    setStatus('Decoding barcode...');

    try {
      const compressed = await compressImage(file);
      const decoded = await decodeBarcode(compressed);
      setStatus(`Barcode found: ${decoded.code}`);

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
      data.barcode = { ...data.barcode, detectionMethod: decoded.method, confidence: decoded.confidence };
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
