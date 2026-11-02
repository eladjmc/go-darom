import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

export function ReturnToGameChip() {
  const { token, me } = useAuth();
  const { pathname } = useLocation();
  const [gameId, setGameId] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !me?.onboardingCompleted) {
      setGameId(null);
      return;
    }
    let cancelled = false;
    const tick = () => {
      void fetch("/games/active", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { gameId?: string } | null) => {
          if (!cancelled) setGameId(data && data.gameId ? data.gameId : null);
        })
        .catch(() => {
          if (!cancelled) setGameId(null);
        });
    };
    tick();
    const id = window.setInterval(tick, 15000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [token, me?.onboardingCompleted]);

  if (!gameId) return null;
  if (pathname === `/play/${gameId}`) return null;

  return (
    <div className="return-to-game">
      <Link to={`/play/${gameId}`}>חזרה למשחק</Link>
    </div>
  );
}
