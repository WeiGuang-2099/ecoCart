import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' }
];

const SETTINGS_KEY = 'ecocart_settings';

function getSettings() {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? JSON.parse(data) : { darkMode: false, city: 'Sydney', language: 'en' };
  } catch {
    return { darkMode: false, city: 'Sydney', language: 'en' };
  }
}

function saveSettings(settings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export default function Settings() {
  const [settings, setSettings] = useState(() => getSettings());
  const { clear, history } = useScanHistory();
  const { t, i18n } = useTranslation();

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
    if (key === 'language') {
      i18n.changeLanguage(value);
    }
  };

  return (
    <div className="settings">
      <h2>{t('settings.title')}</h2>

      <div className="settings-group">
        <h3>{t('settings.appearance')}</h3>
        <div className="setting-row">
          <div>
            <strong>{t('settings.darkMode')}</strong>
            <p className="setting-desc">{t('settings.darkModeDesc')}</p>
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
        <h3>{t('settings.location')}</h3>
        <div className="setting-row">
          <div>
            <strong>{t('settings.defaultCity')}</strong>
            <p className="setting-desc">{t('settings.defaultCityDesc')}</p>
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
        <h3>{t('settings.data')}</h3>
        <div className="setting-row">
          <div>
            <strong>{t('settings.scanHistory')}</strong>
            <p className="setting-desc">{t('settings.scansStored', { count: history.length })}</p>
          </div>
          <button className="btn-secondary" onClick={clear} disabled={history.length === 0}>
            {t('settings.clearHistory')}
          </button>
        </div>
      </div>

      <div className="settings-group">
        <h3>{t('settings.about')}</h3>
        <p>EcoCart Australia v1.0</p>
        <div className="setting-row">
          <div>
            <strong>Language</strong>
            <p className="setting-desc">Interface language</p>
          </div>
          <select
            value={settings.language || 'en'}
            onChange={(e) => updateSetting('language', e.target.value)}
            className="setting-select"
          >
            {LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.label}</option>)}
          </select>
        </div>
        <p className="setting-desc">{t('settings.privacy')}</p>
      </div>
    </div>
  );
}
