// Re-export from the canonical hook's storage layer for non-React usage.
// Prefer useScanHistory() hook inside React components.

const HISTORY_KEY = 'ecocart_scan_history';
const MAX_HISTORY = 50;

export function getScanHistory() {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function addScanRecord(record) {
  const history = getScanHistory();
  history.unshift({
    ...record,
    timestamp: new Date().toISOString(),
    id: Date.now()
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  // Notify any active useScanHistory hook to refresh
  window.dispatchEvent(new StorageEvent('storage', { key: HISTORY_KEY }));
}

export function clearScanHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function getTotalCarbonReduction() {
  const history = getScanHistory();
  return history.reduce((total, record) => {
    const maxReduction = Math.max(
      ...(record.alternatives || []).map(a => a.carbonReduction || 0),
      0
    );
    return total + maxReduction;
  }, 0);
}

export function getLatestScanByBarcode(barcode) {
  if (!barcode) return null;
  const history = getScanHistory();
  return history.find(r => r.barcode?.code === barcode) || null;
}
