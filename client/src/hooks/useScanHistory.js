import { useState, useCallback } from 'react';

const HISTORY_KEY = 'ecocart_scan_history';
const MAX_HISTORY = 50;

function loadHistory() {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY)));
}

export function useScanHistory() {
  const [history, setHistory] = useState(() => loadHistory());

  const add = useCallback((scan) => {
    const entry = {
      ...scan,
      id: Date.now(),
      timestamp: new Date().toISOString(),
    };
    setHistory((prev) => {
      const updated = [entry, ...prev].slice(0, MAX_HISTORY);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const remove = useCallback((id) => {
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const clear = useCallback(() => {
    setHistory([]);
    localStorage.removeItem(HISTORY_KEY);
  }, []);

  return { history, add, remove, clear };
}
