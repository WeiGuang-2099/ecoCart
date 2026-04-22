import BarcodeScanner from '../components/BarcodeScanner';

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <h2>Scan. Compare. Reduce.</h2>
        <p>Discover the carbon footprint of Australian supermarket products and find eco-friendly alternatives.</p>
      </section>
      <BarcodeScanner />
    </div>
  );
}
