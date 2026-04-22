async function extractBarcode() {
  return {
    detected: false,
    code: null,
    detectionMethod: 'client-required',
    confidence: 0,
    message: 'Please use client-side barcode detection and call /api/lookup-barcode'
  };
}

module.exports = { extractBarcode };
