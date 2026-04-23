import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AcccBadge from '../components/AcccBadge';
import AlternativeCard from '../components/AlternativeCard';
import CarbonChart from '../components/CarbonChart';
import EmissionComparison from '../components/EmissionComparison';
import { addScanRecord } from '../utils/storage';

export default function Results() {
  const location = useLocation();
  const data = location.state?.scanData;
  const { t } = useTranslation();

  useEffect(() => {
    if (data && data.barcode?.code) {
      addScanRecord(data);
    }
  }, [data]);

  if (!data) {
    return (
      <div className="results-empty">
        <h2>{t('results.noData')}</h2>
        <p>{t('results.scanFirst')}</p>
        <Link to="/" className="btn-primary">{t('results.goToScanner')}</Link>
      </div>
    );
  }

  const { barcode, carbonFootprint, alternatives, acccCompliance, governmentData } = data;
  const productName = carbonFootprint?.productName || barcode?.code || 'Unknown product';

  return (
    <div className="results">
      <section className="results-header">
        <h2>{productName}</h2>
        {carbonFootprint?.brand && <p className="brand">by {carbonFootprint.brand}</p>}
      </section>

      <div className="results-grid">
        {/* Barcode info */}
        <div className="result-card">
          <h3>{t('results.barcodeInfo')}</h3>
          <p><strong>{t('results.code')}:</strong> {barcode?.code}</p>
          <p><strong>{t('results.type')}:</strong> {barcode?.type}</p>
          <p><strong>{t('results.method')}:</strong> {barcode?.detectionMethod}</p>
          <p><strong>{t('results.confidence')}:</strong> {((barcode?.confidence || 0) * 100).toFixed(1)}%</p>
          <div className="confidence-bar">
            <div className="confidence-fill" style={{ width: `${(barcode?.confidence || 0) * 100}%` }}></div>
          </div>
          {barcode?.isAustralian
            ? <span className="badge badge-success">{t('results.australianProduct')}</span>
            : <span className="badge badge-warning">{t('results.importedProduct')}</span>}
        </div>

        {/* Carbon footprint */}
        <div className="result-card carbon-card">
          <h3>{t('results.carbonFootprint')}</h3>
          <div className="carbon-total">
            <span className="carbon-value">{carbonFootprint?.co2_kg?.toFixed(3) || '0.000'}</span>
            <span className="carbon-unit">kg CO2e</span>
          </div>
          <div className="carbon-breakdown">
            <div className="breakdown-row">
              <span>{t('results.production')}</span>
              <span>{carbonFootprint?.production_emissions?.toFixed(3) || '0.000'} kg</span>
            </div>
            <div className="breakdown-row">
              <span>{t('results.transportEmissions')}</span>
              <span>{carbonFootprint?.transport_emissions?.toFixed(3) || '0.000'} kg</span>
            </div>
            <div className="breakdown-row">
              <span>{t('results.packaging')}</span>
              <span>{carbonFootprint?.packaging_emissions?.toFixed(3) || '0.000'} kg</span>
            </div>
          </div>
          <div className="carbon-details">
            {carbonFootprint?.origin && <p>{t('results.origin')}: {carbonFootprint.origin}</p>}
            {carbonFootprint?.transport_method && <p>{t('results.transport')}: {carbonFootprint.transport_method}</p>}
            {carbonFootprint?.distance_km > 0 && <p>{t('results.distance')}: {carbonFootprint.distance_km} km</p>}
            <p>{t('results.confidence')}: {carbonFootprint?.confidence}</p>
          </div>
          <div className="chart-section">
            <h4>{t('results.emissionBreakdown')}</h4>
            <CarbonChart
              production={carbonFootprint?.production_emissions}
              transport={carbonFootprint?.transport_emissions}
              packaging={carbonFootprint?.packaging_emissions}
            />
          </div>
        </div>

        {/* ACCC Compliance */}
        <div className="result-card">
          <h3>{t('results.acccCompliance')}</h3>
          <AcccBadge compliance={acccCompliance} />
        </div>

        {/* Government data */}
        {governmentData?.afsisData && (
          <div className="result-card">
            <h3>{t('results.govData')}</h3>
            <p>Origin: {governmentData.afsisData.productOrigin?.country}</p>
            <p>Certifications: {governmentData.afsisData.certifications?.join(', ') || 'None'}</p>
            <p>Reliability: {governmentData.dataQuality?.afsisReliability}</p>
          </div>
        )}

        {/* Alternatives */}
        <div className="result-card alternatives-card">
          <h3>{t('results.alternatives')}</h3>
          {alternatives?.map((alt, i) => <AlternativeCard key={i} alternative={alt} />)}
        </div>

        {/* Emission Comparison */}
        <div className="result-card">
          <h3>{t('results.emissionComparison')}</h3>
          <EmissionComparison
            currentEmissions={carbonFootprint?.co2_kg}
            alternatives={alternatives}
          />
        </div>
      </div>

      <div className="results-actions">
        <Link to="/" className="btn-primary">{t('results.scanAnother')}</Link>
      </div>
    </div>
  );
}
