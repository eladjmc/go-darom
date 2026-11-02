import "../styles/global.css";
import "../play/play.css";
import "../pages/members.css";

type Scene = "empty" | "active" | "incoming" | "outgoing" | "multi" | "expired";

function parseScene(): Scene {
  const q = new URLSearchParams(window.location.search).get("scene");
  if (q === "active" || q === "incoming" || q === "outgoing" || q === "multi" || q === "expired") return q;
  return "empty";
}

function Avatar({ letter }: { letter: string }) {
  return (
    <span className="play-hub-avatar play-hub-avatar-fallback" aria-hidden="true">
      {letter}
    </span>
  );
}

/**
 * Visual fixture for Games Hub layout QA.
 * Route: /dev/play-hub-smoke?scene=empty|active|incoming|outgoing|multi|expired
 */
export function PlayHubSmoke() {
  const scene = parseScene();
  const showActive = scene === "active";
  const inviteTab =
    scene === "outgoing" || scene === "expired" ? "outgoing" : scene === "empty" ? "incoming" : "incoming";
  const incomingCount = scene === "incoming" || scene === "multi" ? (scene === "multi" ? 3 : 1) : 0;
  const outgoingCount = scene === "outgoing" || scene === "multi" || scene === "expired" ? (scene === "multi" ? 2 : 1) : 0;
  const listedTab = inviteTab;
  const listCount =
    listedTab === "incoming"
      ? incomingCount
      : scene === "expired"
        ? 0
        : outgoingCount;

  return (
    <section className="play-hub section" data-testid="play-hub-smoke" data-scene={scene} dir="rtl" lang="he">
      <div className="play-hub-inner">
        <header className="play-hub-header">
          <div className="play-hub-header-copy">
            <h1>משחקים</h1>
            <p className="play-hub-lede">הזמינו חבר למשחק חי — בלי דירוגים ובלי טורנירים.</p>
          </div>
          <div className="play-hub-header-actions">
            <button type="button" className="btn btn-primary play-hub-cta" disabled={showActive}>
              משחק חדש
            </button>
          </div>
        </header>

        <div className="play-hub-dashboard">
          <section className="play-hub-panel play-hub-panel-primary" aria-labelledby="smoke-game-title">
            <div className="play-hub-panel-head">
              <h2 id="smoke-game-title">המשחק שלי</h2>
            </div>
            {!showActive ? (
              <div className="play-hub-empty play-hub-empty-compact">
                <div>
                  <p className="play-hub-empty-title">אין משחק חי כרגע</p>
                  <p className="play-hub-empty-copy">הזמינו חבר ותתחילו משחק ידידותי.</p>
                </div>
                <button type="button" className="btn btn-secondary btn-compact">
                  משחק חדש
                </button>
              </div>
            ) : (
              <article className="play-hub-active">
                <div className="play-hub-active-main">
                  <Avatar letter="מ" />
                  <div className="play-hub-active-copy">
                    <strong>מישה</strong>
                    <ul className="play-hub-meta-chips" aria-label="פרטי המשחק">
                      <li>19×19</li>
                      <li className="is-turn">התור שלכם</li>
                      <li>שעון 12:40</li>
                    </ul>
                  </div>
                </div>
                <button type="button" className="btn btn-primary">
                  חזרה למשחק
                </button>
              </article>
            )}
          </section>

          <section className="play-hub-panel play-hub-panel-secondary" aria-labelledby="smoke-invites-title">
            <div className="play-hub-panel-head play-hub-panel-head-split">
              <h2 id="smoke-invites-title">הזמנות למשחק</h2>
              <div className="play-hub-tabs" role="tablist" aria-label="סוג הזמנות">
                <button
                  type="button"
                  role="tab"
                  aria-selected={listedTab === "incoming"}
                  className={`play-hub-tab${listedTab === "incoming" ? " is-on" : ""}`}
                >
                  נכנסות
                  {incomingCount > 0 ? <span className="play-hub-tab-count">{incomingCount}</span> : null}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={listedTab === "outgoing"}
                  className={`play-hub-tab${listedTab === "outgoing" ? " is-on" : ""}`}
                >
                  יוצאות
                  {outgoingCount > 0 ? <span className="play-hub-tab-count">{outgoingCount}</span> : null}
                </button>
              </div>
            </div>

            {listCount === 0 ? (
              <div className="play-hub-empty play-hub-empty-compact">
                <p className="play-hub-empty-title">
                  {scene === "expired"
                    ? "אין הזמנות יוצאות"
                    : listedTab === "incoming"
                      ? "אין הזמנות נכנסות"
                      : "אין הזמנות יוצאות"}
                </p>
                <p className="play-hub-empty-copy">
                  {scene === "expired"
                    ? "הזמנות שפג תוקפן אינן מוצגות כפעילות."
                    : listedTab === "incoming"
                      ? "כשחבר יזמין אתכם — ההזמנה תופיע כאן."
                      : "הזמנות ששלחתם יופיעו כאן עד לקבלה או לדחייה."}
                </p>
              </div>
            ) : (
              <ul className="play-hub-invite-list">
                {Array.from({ length: listCount }, (_, i) => {
                  const namesIn = ["אלעד", "נועה", "יואב"];
                  const namesOut = ["דנה", "אורי"];
                  const name = listedTab === "incoming" ? namesIn[i]! : namesOut[i]!;
                  return (
                    <li key={`${listedTab}-${i}`} className="play-hub-invite">
                      <div className="play-hub-invite-main">
                        <Avatar letter={name.slice(0, 1)} />
                        <div className="play-hub-invite-copy">
                          <strong>{name}</strong>
                          <p>
                            {i % 2 === 0 ? "9×9 · ללא שעון · צבע אקראי · קומי 6.5" : "13×13 · שעון 15 דק׳ · המזמין שחור · קומי 6.5"}
                          </p>
                          <p className="play-hub-invite-ttl">
                            נותרו <time>3 דק׳ 12 שנ׳</time>
                          </p>
                        </div>
                      </div>
                      <div className="play-hub-invite-actions">
                        {listedTab === "incoming" ? (
                          <>
                            <button type="button" className="btn btn-primary btn-compact">
                              קבלה
                            </button>
                            <button type="button" className="btn btn-secondary btn-compact">
                              דחייה
                            </button>
                          </>
                        ) : (
                          <button type="button" className="btn btn-secondary btn-compact">
                            ביטול
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section
            className="play-hub-panel play-hub-panel-history"
            aria-labelledby="smoke-history-title"
            data-testid="play-history"
          >
            <div className="play-hub-panel-head">
              <h2 id="smoke-history-title">משחקים קודמים</h2>
            </div>
            <ul className="play-hub-history-list">
              <li className="play-hub-history-row">
                <div className="play-hub-history-main">
                  <Avatar letter="א" />
                  <div className="play-hub-history-copy">
                    <strong>אלעד</strong>
                    <ul className="play-hub-meta-chips" aria-label="סיכום משחק">
                      <li>13×13</li>
                      <li>2 בנוב׳ 2026</li>
                    </ul>
                    <p className="play-hub-history-result">המשחק הסתיים בהסכמה, ללא מנצח</p>
                  </div>
                </div>
                <button type="button" className="btn btn-secondary btn-compact">
                  צפייה במשחק
                </button>
              </li>
              <li className="play-hub-history-row">
                <div className="play-hub-history-main">
                  <Avatar letter="ד" />
                  <div className="play-hub-history-copy">
                    <strong>דנה</strong>
                    <ul className="play-hub-meta-chips" aria-label="סיכום משחק">
                      <li>9×9</li>
                      <li>1 בנוב׳ 2026</li>
                    </ul>
                    <p className="play-hub-history-result">הלבן ניצח ב־3.5 נקודות</p>
                  </div>
                </div>
                <button type="button" className="btn btn-secondary btn-compact">
                  צפייה במשחק
                </button>
              </li>
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
}
