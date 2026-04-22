import { useLocation, Link } from 'react-router-dom';
import { useEffect } from 'react';
import AcccBadge from '../components/AcccBadge';
import AlternativeCard from '../components/AlternativeCard';
import CarbonChart from '../components/CarbonChart';
import EmissionComparison from '../components/EmissionComparison';
import { addScanRecord } from '../utils/storage';

export default function Results() {
  const location = useLocation();
  const data = location.state?.scanData;

  useEffect(() => {
    if (data && data.barcode?.code) {
      addScanRecord(data);
    }
  }, [data]);

  if (!data) {
    return (
      <div className="results-empty">
        <h2>No scan data</h2>
        <p>Scan a product barcode first.</p>
        <Link to="/" className="btn-primary">Go to Scanner</Link>
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
          <h3>Barcode Information</h3>
          <p><strong>Code:</strong> {barcode?.code}</p>
          <p><strong>Type:</strong> {barcode?.type}</p>
          <p><strong>Method:</strong> {barcode?.detectionMethod}</p>
          <p><strong>Confidence:</strong> {((barcode?.confidence || 0) * 100).toFixed(1)}%</p>
          <div className="confidence-bar">
            <div className="confidence-fill" style={{ width: `${(barcode?.confidence || 0) * 100}%` }}></div>
          </div>
          {barcode?.isAustralian
            ? <span className="badge badge-success">Australian Product</span>
            : <span className="badge badge-warning">Imported Product</span>}
        </div>

        {/* Carbon footprint */}
        <div className="result-card carbon-card">
          <h3>Carbon Footprint</h3>
          <div className="carbon-total">
            <span className="carbon-value">{carbonFootprint?.co2_kg?.toFixed(3) || '0.000'}</span>
            <span className="carbon-unit">kg CO2e</span>
          </div>
          <div className="carbon-breakdown">
            <div className="breakdown-row">
              <span>Production</span>
              <span>{carbonFootprint?.production_emissions?.toFixed(3) || '0.000'} kg</span>
            </div>
            <div className="breakdown-row">
              <span>Transport</span>
              <span>{carbonFootprint?.transport_emissions?.toFixed(3) || '0.000'} kg</span>
            </div>
            <div className="breakdown-row">
              <span>Packaging</span>
              <span>{carbonFootprint?.packaging_emissions?.toFixed(3) || '0.000'} kg</span>
            </div>
          </div>
          <div className="carbon-details">
            {carbonFootprint?.origin && <p>Origin: {carbonFootprint.origin}</p>}
            {carbonFootprint?.transport_method && <p>Transport: {carbonFootprint.transport_method}</p>}
            {carbonFootprint?.distance_km > 0 && <p>Distance: {carbonFootprint.distance_km} km</p>}
            <p>Confidence: {carbonFootprint?.confidence}</p>
          </div>
          <div className="chart-section">
            <h4>Emission Breakdown</h4>
            <CarbonChart
              production={carbonFootprint?.production_emissions}
              transport={carbonFootprint?.transport_emissions}
              packaging={carbonFootprint?.packaging_emissions}
            />
          </div>
        </div>

        {/* ACCC Compliance */}
        <div className="result-card">
          <h3>ACCC Compliance</h3>
          <AcccBadge compliance={acccCompliance} />
        </div>

        {/* Government data */}
        {governmentData?.afsisData && (
          <div className="result-card">
            <h3>Government Data</h3>
            <p>Origin: {governmentData.afsisData.productOrigin?.country}</p>
            <p>Certifications: {governmentData.afsisData.certifications?.join(', ') || 'None'}</p>
            <p>Reliability: {governmentData.dataQuality?.afsisReliability}</p>
          </div>
        )}

        {/* Alternatives */}
        <div className="result-card alternatives-card">
          <h3>Eco Alternatives</h3>
          {alternatives?.map((alt, i) => <AlternativeCard key={i} alternative={alt} />)}
        </div>

        {/* Emission Comparison */}
        <div className="result-card">
          <h3>Emission Comparison</h3>
          <EmissionComparison
            currentEmissions={carbonFootprint?.co2_kg}
            alternatives={alternatives}
          />
        </div>
      </div>

      <div className="results-actions">
        <Link to="/" className="btn-primary">Scan Another</Link>
      </div>
    </div>
  );
}
