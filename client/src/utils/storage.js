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
    timestamp: Date.now(),
    id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2)
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export function clearScanHistory() {
  localStorage.removeItem(HISTORY_KEY);
}

export function getTotalCarbonReduction() {
  const history = getScanHistory();
  return history.reduce((total, record) => {
    const maxReduction = Math.max(...(record.alternatives || []).map(a => a.carbonReduction || 0), 0);
    return total + maxReduction;
  }, 0);
}
