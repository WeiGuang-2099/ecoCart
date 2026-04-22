import { useState, useEffect } from 'react';
import { useScanHistory } from '../hooks/useScanHistory';

const CITIES = [
  { name: 'Sydney', lat: -33.87, lng: 151.21 },
  { name: 'Melbourne', lat: -37.81, lng: 144.96 },
  { name: 'Brisbane', lat: -27.47, lng: 153.03 },
  { name: 'Perth', lat: -31.95, lng: 115.86 },
  { name: 'Adelaide', lat: -34.93, lng: 138.60 },
  { name: 'Canberra', lat: -35.28, lng: 149.13 },
  { name: 'Hobart', lat: -42.88, lng: 147.33 },
  { name: 'Darwin', lat: -12.46, lng: 130.85 }
];

const SETTINGS_KEY = 'ecocart_settings';

function getSettings() {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : { darkMode: false, city: 'Sydney' };
  } catch {
    return { darkMode: false, city: 'Sydney' };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export default function Settings() {
  const [settings, setSettings] = useState(() => getSettings());
  const { clear, history } = useScanHistory();

  useEffect(() => {
    saveSettings(settings);
    if (settings.darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [settings]);

  const updateSetting = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="settings">
      <h2>Settings</h2>

      <div className="settings-group">
        <h3>Appearance</h3>
        <div className="setting-row">
          <div>
            <strong>Dark Mode</strong>
            <p className="setting-desc">Reduce eye strain in low light</p>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={settings.darkMode}
              onChange={(e) => updateSetting('darkMode', e.target.checked)}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-group">
        <h3>Location</h3>
        <div className="setting-row">
          <div>
            <strong>Default City</strong>
            <p className="setting-desc">Used for eco store search</p>
          </div>
          <select
            value={settings.city}
            onChange={(e) => updateSetting('city', e.target.value)}
            className="setting-select"
          >
            {CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="settings-group">
        <h3>Data</h3>
        <div className="setting-row">
          <div>
            <strong>Scan History</strong>
            <p className="setting-desc">{history.length} scans stored</p>
          </div>
          <button className="btn-secondary" onClick={clear} disabled={history.length === 0}>
            Clear History
          </button>
        </div>
      </div>

      <div className="settings-group">
        <h3>About</h3>
        <p>EcoCart Australia v1.0</p>
        <p className="setting-desc">Privacy Act 1988 Compliant | ACCC Guidelines | Zero data retention</p>
      </div>
    </div>
  );
}
