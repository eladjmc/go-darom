import { FormEvent, useEffect, useMemo, useState, type ReactNode } from "react";
import { Link, Navigate } from "react-router-dom";
import { useUser } from "@clerk/react";
import type { BlockListItem } from "@go-darom/shared";
import { useAuth } from "../auth/AuthContext";
import { patchMe } from "../auth/api";
import { fetchBlocks, unblockUser } from "../auth/community-api";
import { BrandMark } from "../components/layout/BrandMark";
import "./auth.css";

/** Reads Google avatar from Clerk when available (clerk mode only). */
function ClerkGooglePhoto({ children }: { children: (url: string | null) => ReactNode }) {
  const { user } = useUser();
  return <>{children(user?.imageUrl ?? null)}</>;
}

function MeProfileForm({
  googlePhotoFallback,
}: {
  googlePhotoFallback: string | null;
}) {
  const { me, token, loading, refreshMe, signOut } = useAuth();
  const [nickname, setNickname] = useState("");
  const [usePhoto, setUsePhoto] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [blocks, setBlocks] = useState<BlockListItem[]>([]);

  useEffect(() => {
    if (!me) return;
    setNickname(me.nickname ?? "");
    setUsePhoto(Boolean(me.avatarUrl));
  }, [me]);

  useEffect(() => {
    if (!token || !me?.onboardingCompleted) return;
    void fetchBlocks(token).then((res) => setBlocks(res.items));
  }, [token, me?.onboardingCompleted]);

  const googlePhoto = me?.avatarUrl || googlePhotoFallback || null;
  const savedNickname = (me?.nickname ?? "").trim();
  const savedUsesPhoto = Boolean(me?.avatarUrl);
  const trimmed = nickname.trim();

  const dirty = useMemo(() => {
    if (!me) return false;
    return trimmed !== savedNickname || usePhoto !== savedUsesPhoto;
  }, [me, trimmed, savedNickname, usePhoto, savedUsesPhoto]);

  const canSave = dirty && trimmed.length >= 2 && !saving;

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token || !canSave) return;
    if (trimmed.length < 2) {
      setError("בחרו כינוי באורך של לפחות שני תווים.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await patchMe(token, {
        nickname: trimmed,
        avatarUrl: usePhoto ? googlePhoto : null,
      });
      await refreshMe();
      setMessage("הפרופיל עודכן");
    } catch (err) {
      setError(err instanceof Error ? err.message : "עדכון נכשל");
    } finally {
      setSaving(false);
    }
  };

  if (!me) return null;

  const initial = (trimmed || me.nickname || "?").slice(0, 1).toUpperCase();
  const showPhoto = usePhoto && Boolean(googlePhoto);

  return (
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
              onClick={() => {
                setUsePhoto(true);
                setMessage(null);
              }}
            >
              עם תמונת Google
            </button>
            <button
              type="button"
              className={`onboard-choice${!usePhoto ? " is-selected" : ""}`}
              aria-pressed={!usePhoto}
              onClick={() => {
                setUsePhoto(false);
                setMessage(null);
              }}
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
          onChange={(e) => {
            setNickname(e.target.value);
            setMessage(null);
          }}
          maxLength={32}
          required
          autoComplete="nickname"
          placeholder="למשל: אילה"
        />
      </label>

      {message && (
        <p className="auth-success" role="status">
          {message}
        </p>
      )}
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <div className="me-actions">
        <button
          className="btn btn-primary"
          type="submit"
          disabled={!canSave}
          aria-disabled={!canSave}
        >
          {saving ? "שומרים…" : "שמירת שינויים"}
        </button>
        <button className="btn btn-secondary me-signout" type="button" onClick={() => void signOut()}>
          התנתקות
        </button>
      </div>

      <div className="onboard-avatar-block" style={{ justifyItems: "stretch" }}>
        <strong>רשימת חסימות</strong>
        {blocks.length === 0 ? (
          <p className="auth-status">אין חסימות.</p>
        ) : (
          blocks.map((b) => (
            <div key={b.id} className="chat-actions" style={{ justifyContent: "space-between" }}>
              <span>{b.nickname}</span>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() =>
                  void unblockUser(token!, b.id).then((res) => setBlocks(res.items))
                }
              >
                ביטול חסימה
              </button>
            </div>
          ))
        )}
      </div>

      <p className="auth-secondary">
        <Link to="/community">לעמוד הקהילה</Link>
      </p>

      {loading && <p className="auth-status">מעדכנים…</p>}
    </form>
  );
}

export function MePage() {
  const { me, loading, mode } = useAuth();

  if (!loading && !me) return <Navigate to="/sign-in" replace />;
  if (me && !me.onboardingCompleted) return <Navigate to="/onboarding" replace />;

  return (
    <section className="auth-page">
      <div className="auth-card onboard-card">
        <BrandMark />
        <h1 className="auth-title">האזור שלי</h1>
        <p className="auth-lede">כינוי ותמונה בלבד — בלי אימייל ציבורי, דירוג או סטטיסטיקות.</p>

        {loading && !me ? (
          <p className="auth-status">טוענים…</p>
        ) : mode === "clerk" ? (
          <ClerkGooglePhoto>
            {(clerkUrl) => <MeProfileForm googlePhotoFallback={clerkUrl} />}
          </ClerkGooglePhoto>
        ) : (
          <MeProfileForm googlePhotoFallback={null} />
        )}
      </div>
    </section>
  );
}
