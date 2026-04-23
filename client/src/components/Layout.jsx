import { Link, Outlet } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function Layout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="header-content">
          <Link to="/" className="logo">
            <span className="logo-icon">E</span>
            <span className="logo-text">EcoCart</span>
          </Link>
          <nav className={`nav ${menuOpen ? 'nav-open' : ''}`}>
            <Link to="/" onClick={() => setMenuOpen(false)}>{t('nav.scan')}</Link>
            <Link to="/history" onClick={() => setMenuOpen(false)}>{t('nav.history')}</Link>
            <Link to="/settings" onClick={() => setMenuOpen(false)}>{t('nav.settings')}</Link>
          </nav>
          <button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)}>
            <span></span><span></span><span></span>
          </button>
        </div>
      </header>
      <main className="layout-main">
        <Outlet />
      </main>
      <footer className="layout-footer">
        <div className="footer-content">
          <p>EcoCart Australia -- Privacy Act 1988 Compliant | ACCC Guidelines</p>
        </div>
      </footer>
    </div>
  );
}
