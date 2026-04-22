export default function AcccBadge({ compliance }) {
  if (!compliance?.acccCompliance) return null;
  const { status, riskLevel, warnings, recommendations } = compliance.acccCompliance;
  const isCompliant = status === 'compliant';

  return (
    <div className={`accc-badge ${isCompliant ? 'accc-compliant' : 'accc-warning'}`}>
      <h4>ACCC Compliance: {status}</h4>
      <p>Risk level: <strong>{riskLevel}</strong></p>
      {warnings.length > 0 && (
        <ul className="accc-warnings">
          {warnings.map((w, i) => <li key={i}>{w.message}</li>)}
        </ul>
      )}
      {recommendations.length > 0 && (
        <ul className="accc-recommendations">
          {recommendations.map((r, i) => <li key={i}>{r}</li>)}
        </ul>
      )}
    </div>
  );
}
