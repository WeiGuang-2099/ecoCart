import { useTranslation } from 'react-i18next';
import BarcodeScanner from '../components/BarcodeScanner';

export default function Home() {
  const { t } = useTranslation();
  return (
    <div className="home">
      <section className="hero">
        <h2>{t('hero.title')}</h2>
        <p>{t('hero.subtitle')}</p>
      </section>
      <BarcodeScanner />
    </div>
  );
}
