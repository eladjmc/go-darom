import { useEffect, useState } from "react";
import type { HealthResponse } from "@go-darom/shared";

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/health")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return (await res.json()) as HealthResponse;
      })
      .then((body) => {
        if (!cancelled) {
          setHealth(body);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "שגיאה לא ידועה");
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="shell">
      <header className="brand">
        <p className="eyebrow">קהילת גו בדרום</p>
        <h1>גו דרום</h1>
        <p className="lede">יסודות מערכת — אבן דרך 1 (ללא עיצוב סופי)</p>
      </header>

      <section className="panel" aria-live="polite">
        <h2>סטטוס שרת</h2>
        {error && <p className="warn">לא ניתן להתחבר ל־API: {error}</p>}
        {!error && !health && <p>טוען…</p>}
        {health && (
          <ul>
            <li>מצב: {health.status === "ok" ? "תקין" : "מוגבל"}</li>
            <li>מסד נתונים: {health.db === "up" ? "פעיל" : "לא זמין"}</li>
            <li>גרסה: {health.version}</li>
          </ul>
        )}
      </section>

      <p className="note">
        לוגו וקטור סופי טרם אושר — זהו מעטפת זמנית בלבד. לוח גו יוצג ממנוע המשחק, לא מתמונה.
      </p>
    </main>
  );
}
