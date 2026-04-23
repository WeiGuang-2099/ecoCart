import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useScanHistory } from '../hooks/useScanHistory';

export default function History() {
  const { history, totalReduction, clear } = useScanHistory();
  const { t } = useTranslation();

  return (
    <div className="history">
      <div className="history-header">
        <h2>{t('history.title')}</h2>
        <div className="history-stats">
          <div className="stat-card">
            <span className="stat-value">{history.length}</span>
            <span className="stat-label">{t('history.scans')}</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{totalReduction.toFixed(1)}</span>
            <span className="stat-label">{t('history.co2Saved')}</span>
          </div>
        </div>
        {history.length > 0 && (
          <button className="btn-secondary" onClick={clear}>{t('history.clearHistory')}</button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="history-empty">
          <p>{t('history.noScans')}</p>
          <Link to="/" className="btn-primary">{t('history.startScanning')}</Link>
        </div>
      ) : (
        <div className="history-list">
          {history.map((record) => (
            <div key={record.id} className="history-item">
              <div className="history-item-main">
                <h4>{record.carbonFootprint?.productName || record.barcode?.code || 'Unknown'}</h4>
                <p className="history-item-brand">{record.carbonFootprint?.brand || ''}</p>
                <p className="history-item-carbon">
                  {record.carbonFootprint?.co2_kg?.toFixed(3) || '0.000'} kg CO2e
                </p>
              </div>
              <div className="history-item-meta">
                <span className="history-item-date">
                  {new Date(record.timestamp).toLocaleDateString()}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
