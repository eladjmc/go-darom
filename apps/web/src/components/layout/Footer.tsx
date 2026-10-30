import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <strong>גו דרום</strong>
          <p>קהילת גו חמה ומזמינה בדרום הארץ — לומדים, משחקים, נפגשים.</p>
        </div>
        <nav className="footer-nav" aria-label="כותרת תחתונה">
          <Link to="/learn">לומדים גו</Link>
          <Link to="/events">מפגשים</Link>
          <Link to="/shop">חנות</Link>
        </nav>
      </div>
    </footer>
  );
}
