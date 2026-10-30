import { Link } from "react-router-dom";
import { AppIcon } from "../components/icons/AppIcon";
import { useAuth } from "../auth/AuthContext";
import { rememberReturnIntent } from "../auth/return-intent";
import "./home.css";

export function HomePage() {
  const { me, mode, setDevStubUser } = useAuth();

  const join = () => {
    // Explicit homepage CTA → return home after auth (protected routes set their own intent).
    rememberReturnIntent("/");
    if (mode === "dev-stub") {
      setDevStubUser(`local_${Date.now()}`);
      return;
    }
    window.location.assign("/sign-in");
  };

  const primaryCta = me ? (
    <Link className="btn btn-primary" to="/me">
      האזור שלי
    </Link>
  ) : (
    <button type="button" className="btn btn-primary" onClick={join}>
      הצטרפו לקהילה
    </button>
  );

  const eventsCta = (
    <Link className="btn btn-secondary" to="/events">
      למפגשים הקרובים
    </Link>
  );

  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-stage" aria-hidden="true">
          <picture>
            <source media="(max-width: 899px)" srcSet="/hero/home-hero-mobile.webp" />
            <img
              className="hero-photo"
              src="/hero/home-hero-minimal-natural.webp"
              alt=""
              width={1848}
              height={851}
              fetchPriority="high"
              decoding="async"
            />
          </picture>
        </div>

        <div className="hero-panel">
          <p className="hero-eyebrow">קהילת גו בדרום</p>
          <h1 id="hero-title">
            לומדים.
            <br />
            משחקים.
            <br />
            נפגשים.
          </h1>
          <p className="hero-lede">
            בית לחובבי גו בדרום — ללמוד, לשחק ולהיפגש.
            <br />
            הצטרפו למפגשים, למשחקים ולפעילות הקהילה.
          </p>
          <div className="hero-actions">
            {primaryCta}
            <span className="hero-secondary-desktop">{eventsCta}</span>
          </div>
        </div>

        <div className="hero-secondary-mobile">{eventsCta}</div>

        <span className="visually-hidden">
          תמונת גיבור: לוח גו מעץ עם אבנים שחורות ולבנות בצד שמאל, ומרחב פתוח מימין לטקסט.
        </span>
      </section>

      <section className="section community-section">
        <div className="container">
          <header className="section-head">
            <h2 className="section-title">מה מחכה בקהילה</h2>
            <p className="section-lede">תוכן ציבורי פתוח לכולם. משחק וצ׳אט לחברי הקהילה.</p>
          </header>
          <div className="feature-grid">
            <article className="feature-card">
              <div className="feature-card-icon" aria-hidden="true">
                <AppIcon name="play" size={28} />
              </div>
              <h3>משחקים</h3>
              <p>משחקי Live והתכתבות ידידותיים — בלי דירוגים וטורנירים.</p>
              <Link className="feature-card-action" to="/play">
                למידע על משחק
              </Link>
            </article>
            <article className="feature-card">
              <div className="feature-card-icon" aria-hidden="true">
                <AppIcon name="learn" size={28} />
              </div>
              <h3>לומדים</h3>
              <p>מדריכים, הרצאות ולוחות הדגמה אינטראקטיביים.</p>
              <Link className="feature-card-action" to="/learn">
                לספריית הלמידה
              </Link>
            </article>
            <article className="feature-card">
              <div className="feature-card-icon" aria-hidden="true">
                <AppIcon name="puzzles" size={28} />
              </div>
              <h3>חידות</h3>
              <p>חידת השבוע וספריית חידות ציבורית — בלי לוח תוצאות.</p>
              <Link className="feature-card-action" to="/puzzles">
                לחידות
              </Link>
            </article>
          </div>
        </div>
      </section>

      <section className="section section-alt home-teasers">
        <div className="container split-teasers">
          <article className="teaser-panel">
            <header className="teaser-head">
              <p className="teaser-eyebrow">פתוח לכולם</p>
              <h2 className="teaser-title">מפגשים קרובים</h2>
            </header>
            <div className="teaser-empty">
              <img src="/empty-states/no-events.svg" alt="" width={72} height={72} />
              <p className="teaser-empty-copy">אין מפגשים מפורסמים כרגע.</p>
              <Link className="teaser-empty-link" to="/events">
                לעמוד המפגשים
              </Link>
            </div>
          </article>
          <article className="teaser-panel">
            <header className="teaser-head">
              <p className="teaser-eyebrow">פתוח לכולם</p>
              <h2 className="teaser-title">חידת השבוע</h2>
            </header>
            <div className="teaser-empty">
              <img src="/empty-states/no-puzzles.svg" alt="" width={72} height={72} />
              <p className="teaser-empty-copy">חידת השבוע תתפרסם כאן בקרוב.</p>
              <Link className="teaser-empty-link" to="/puzzles">
                לספריית החידות
              </Link>
            </div>
          </article>
        </div>
      </section>

      {me && (
        <section className="section">
          <div className="container member-strip">
            <p>שלום {me.nickname ?? "חבר/ה"} — אפשר לעדכן פרופיל או לבקר בעמוד הקהילה.</p>
            <div className="hero-actions">
              <Link className="btn btn-primary" to="/me">
                האזור שלי
              </Link>
              <Link className="btn btn-secondary" to="/community">
                הקהילה
              </Link>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
