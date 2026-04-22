export default function AlternativeCard({ alternative }) {
  return (
    <div className="alt-card">
      <h4>{alternative.name}</h4>
      <p className="alt-desc">{alternative.description}</p>
      {alternative.australianContext && <p className="alt-context">{alternative.australianContext}</p>}
      {alternative.exampleBrands && (
        <p className="alt-brands">Suggested: {alternative.exampleBrands.join(', ')}</p>
      )}
      <div className="alt-footer">
        <span className="alt-reduction">-{alternative.carbonReduction.toFixed(2)} kg CO2</span>
        <span className="alt-price">{alternative.priceDiff}</span>
      </div>
    </div>
  );
}
