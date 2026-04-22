import { Link } from 'react-router-dom';
import { useScanHistory } from '../hooks/useScanHistory';

export default function History() {
  const { history, totalReduction, clear } = useScanHistory();

  return (
    <div className="history">
      <div className="history-header">
        <h2>Scan History</h2>
        <div className="history-stats">
          <div className="stat-card">
            <span className="stat-value">{history.length}</span>
            <span className="stat-label">Scans</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{totalReduction.toFixed(1)}</span>
            <span className="stat-label">kg CO2 saved</span>
          </div>
        </div>
        {history.length > 0 && (
          <button className="btn-secondary" onClick={clear}>Clear History</button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="history-empty">
          <p>No scans yet.</p>
          <Link to="/" className="btn-primary">Start Scanning</Link>
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
