import { FormEvent, useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { patchMe } from "../auth/api";
import { consumeReturnIntent } from "../auth/return-intent";
import { BrandMark } from "../components/layout/BrandMark";
import "./auth.css";

export function OnboardingPage() {
  const { me, token, refreshMe, loading } = useAuth();
  const navigate = useNavigate();
  const [nickname, setNickname] = useState("");
  /** Opt-in: Google photo is off until the user chooses it. */
  const [usePhoto, setUsePhoto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!me) return;
    setNickname(me.nickname ?? "");
  }, [me]);

  if (loading || !me) {
    if (!loading && !me) return <Navigate to="/sign-in" replace />;
    return (
      <section className="auth-page">
        <p className="auth-status">טוענים…</p>
      </section>
    );
  }

  if (me.onboardingCompleted) {
    return <Navigate to={consumeReturnIntent("/")} replace />;
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token) return;
    const trimmed = nickname.trim();
    if (trimmed.length < 2) {
      setError("בחרו כינוי באורך של לפחות שני תווים.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await patchMe(token, {
        nickname: trimmed,
        avatarUrl: usePhoto ? (me?.avatarUrl ?? null) : null,
        completeOnboarding: true,
      });
      await refreshMe();
      navigate(consumeReturnIntent("/"), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  };

  const initial = (nickname.trim() || me.nickname || "?").slice(0, 1).toUpperCase();
  const googlePhoto = me.avatarUrl ?? null;
  const showPhoto = usePhoto && Boolean(googlePhoto);

  return (
    <section className="auth-page onboard-page">
      <div className="auth-card onboard-card">
        <BrandMark />
        <h1 className="auth-title">ברוכים הבאים לגו דרום</h1>
        <p className="auth-lede">בחרו כינוי לתצוגה. תמונת Google אופציונלית — אפשר בלי.</p>

        <form className="onboard-form" onSubmit={onSubmit}>
          <div className="onboard-avatar-block">
            {showPhoto ? (
              <img className="onboard-avatar" src={googlePhoto!} alt="" width={88} height={88} />
            ) : (
              <div className="onboard-avatar is-placeholder" aria-hidden="true">
                {initial}
              </div>
            )}

            {googlePhoto ? (
              <div className="onboard-photo-choices" role="group" aria-label="תמונת פרופיל">
                <button
                  type="button"
                  className={`onboard-choice${usePhoto ? " is-selected" : ""}`}
                  aria-pressed={usePhoto}
                  onClick={() => setUsePhoto(true)}
                >
                  עם תמונת Google
                </button>
                <button
                  type="button"
                  className={`onboard-choice${!usePhoto ? " is-selected" : ""}`}
                  aria-pressed={!usePhoto}
                  onClick={() => setUsePhoto(false)}
                >
                  בלי תמונה
                </button>
              </div>
            ) : (
              <p className="auth-status onboard-photo-note">אין תמונה מ־Google — יוצג ראשי תיבות מהכינוי.</p>
            )}
          </div>

          <label className="field">
            כינוי לתצוגה
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              maxLength={32}
              required
              autoComplete="nickname"
              placeholder="למשל: אילה"
            />
          </label>

          {error && (
            <p className="auth-error" role="alert">
              {error}
            </p>
          )}

          <button className="btn btn-primary" type="submit" disabled={saving} aria-busy={saving}>
            {saving ? "שומרים…" : "המשך"}
          </button>
        </form>
      </div>
    </section>
  );
}
