import { useLocation, Link, useSearchParams } from 'react-router-dom';
import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import AcccBadge from '../components/AcccBadge';
import AlternativeCard from '../components/AlternativeCard';
import CarbonChart from '../components/CarbonChart';
import EmissionComparison from '../components/EmissionComparison';
import EcoStoreMap from '../components/EcoStoreMap';
import { addScanRecord, getLatestScanByBarcode } from '../utils/storage';

export default function Results() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const routeData = location.state?.scanData;
  const { t } = useTranslation();

  // Fall back to localStorage cache when page is refreshed
  const data = useMemo(() => {
    if (routeData) return routeData;
    const barcode = searchParams.get('barcode');
    if (barcode) return getLatestScanByBarcode(barcode);
    return null;
  }, [routeData, searchParams]);

  const [ecoStores, setEcoStores] = useState(null);
  const [userLoc, setUserLoc] = useState(null);

  useEffect(() => {
    if (data && data.barcode?.code) {
      addScanRecord(data);
    }
  }, [data]);

  useEffect(() => {
    if (!data) return;
    const carbonFootprint = data.carbonFootprint;
    let city = 'Sydney';
    try {
      const raw = localStorage.getItem('ecocart_settings');
      if (raw) city = JSON.parse(raw).city || 'Sydney';
    } catch {}
    const cityCoords = {
      Sydney: { lat: -33.8688, lng: 151.2093 },
      Melbourne: { lat: -37.8136, lng: 144.9631 },
      Brisbane: { lat: -27.4698, lng: 153.0251 },
      Perth: { lat: -31.9505, lng: 115.8605 },
      Adelaide: { lat: -34.9285, lng: 138.6007 },
      Canberra: { lat: -35.2809, lng: 149.1300 },
      Hobart: { lat: -42.8821, lng: 147.3272 },
      Darwin: { lat: -12.4634, lng: 130.8456 },
    };
    const loc = cityCoords[city] || cityCoords.Sydney;
    setUserLoc(loc);

    fetch('/api/local-alternatives', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productCategory: carbonFootprint?.category || 'Food',
        userLocation: loc,
      }),
    })
      .then(r => r.json())
      .then(d => { if (d.nearbyStores) setEcoStores(d.nearbyStores); })
      .catch(() => {});
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

  const { barcode, carbonFootprint, alternatives, acccCompliance, governmentData, openFoodFacts, warnings } = data;
  const productName = carbonFootprint?.productName || barcode?.code || 'Unknown product';
  const productImage = openFoodFacts?.imageUrl || carbonFootprint?.image || null;

  return (
    <div className="results">
      <section className="results-header">
        {productImage && (
          <img src={productImage} alt={productName} className="product-image" />
        )}
        <h2>{productName}</h2>
        {carbonFootprint?.brand && <p className="brand">by {carbonFootprint.brand}</p>}
      </section>

      {(warnings?.length > 0 || carbonFootprint?.distance_estimated) && (
        <div className="result-card warning-card">
          {carbonFootprint?.distance_estimated && (
            <p className="warning-text">Transport distance estimated (1000 km default). Actual emissions may vary.</p>
          )}
          {warnings?.map((w, i) => (
            <p key={i} className="warning-text">[{w.source}] {w.message}</p>
          ))}
        </div>
      )}

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

        {/* Eco Store Map */}
        {ecoStores && ecoStores.length > 0 && userLoc && (
          <div className="result-card eco-map-card">
            <h3>Nearby Eco Stores</h3>
            <EcoStoreMap stores={ecoStores} userLocation={userLoc} />
          </div>
        )}
      </div>

      <div className="results-actions">
        <Link to="/" className="btn-primary">{t('results.scanAnother')}</Link>
      </div>
    </div>
  );
}
