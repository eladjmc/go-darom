import { Link } from "react-router-dom";
import "./learn.css";

export function LearnPage() {
  return (
    <section className="section learn-page" aria-labelledby="learn-title">
      <div className="container">
        <header className="learn-hero">
          <p className="learn-eyebrow">ספרייה ציבורית</p>
          <h1 id="learn-title" className="section-title">
            לומדים גו
          </h1>
          <p className="learn-lede">
            מדריכים, הרצאות ולוחות הדגמה — פתוחים לכל מבקר. התוכן יופיע כאן כשיתפרסם.
          </p>
        </header>

        <ul className="learn-topics" aria-label="סוגי תוכן בספרייה">
          <li>מדריכים</li>
          <li>הרצאות</li>
          <li>סרטונים</li>
          <li>לוחות הדגמה</li>
        </ul>

        <div className="learn-empty" role="status">
          <div className="learn-empty-rail" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <img src="/empty-states/no-results.svg" alt="" width={72} height={72} />
          <p>עדיין אין מדריכים מפורסמים.</p>
          <Link className="btn btn-secondary" to="/">
            חזרה לבית
          </Link>
        </div>
      </div>
    </section>
  );
}
