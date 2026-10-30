import { FormEvent, useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import type { MemberListItem } from "@go-darom/shared";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "../auth/AuthContext";
import { fetchMembers } from "../auth/api";
import "./members.css";

type ListPhase = "loading" | "refreshing" | "ready" | "error";

function MemberRowSkeleton() {
  return (
    <li className="member-skel" aria-hidden="true">
      <span className="member-skel-avatar" />
      <span className="member-skel-lines">
        <span className="member-skel-line is-name" />
        <span className="member-skel-line is-status" />
      </span>
    </li>
  );
}

export function MembersPage() {
  const { me, token, loading } = useAuth();
  const [q, setQ] = useState("");
  const [items, setItems] = useState<MemberListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<ListPhase>("loading");
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());
  const loadedOnce = useRef(false);

  useEffect(() => {
    if (!token || !me?.onboardingCompleted) return;
    let cancelled = false;
    setPhase(loadedOnce.current ? "refreshing" : "loading");
    setError(null);

    fetchMembers(token, q || undefined)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        loadedOnce.current = true;
        setPhase("ready");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (!loadedOnce.current) setItems([]);
        setError(err instanceof Error ? err.message : "טעינה נכשלה");
        setPhase("error");
      });

    return () => {
      cancelled = true;
    };
  }, [token, q, me?.onboardingCompleted]);

  useEffect(() => {
    if (!token || !me?.onboardingCompleted) return;
    const socket: Socket = io(import.meta.env.VITE_API_URL || window.location.origin, {
      path: "/socket.io",
      auth: { token },
      transports: ["websocket", "polling"],
    });
    socket.on("presence:snapshot", (payload: { onlineUserIds: string[] }) => {
      setOnlineIds(new Set(payload.onlineUserIds));
    });
    socket.on("presence:user", (payload: { userId: string; online: boolean }) => {
      setOnlineIds((prev) => {
        const next = new Set(prev);
        if (payload.online) next.add(payload.userId);
        else next.delete(payload.userId);
        return next;
      });
    });
    return () => {
      socket.disconnect();
    };
  }, [token, me?.onboardingCompleted]);

  if (!loading && !me) return <Navigate to="/sign-in" replace />;
  if (me && !me.onboardingCompleted) return <Navigate to="/onboarding" replace />;

  const onSearch = (event: FormEvent) => {
    event.preventDefault();
  };

  return (
    <section className="section">
      <div className="container members-page">
        <h1 className="section-title">הקהילה</h1>
        <p className="section-lede">חברים בקהילה — כינוי ותמונה בלבד. סטטוס «מחובר» משקף חיבור פעיל לאתר.</p>
        <form className="members-search" onSubmit={onSearch}>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="חיפוש לפי כינוי"
            aria-label="חיפוש לפי כינוי"
          />
        </form>

        {phase === "error" && error && (
          <p className="members-error" role="alert">
            {error}
          </p>
        )}

        {phase === "loading" && (
          <ul className="member-list" aria-busy="true" aria-label="טוענים חברים">
            <MemberRowSkeleton />
            <MemberRowSkeleton />
            <MemberRowSkeleton />
            <MemberRowSkeleton />
          </ul>
        )}

        {phase === "ready" && items.length === 0 && (
          <div className="state-block">
            <img src="/empty-states/no-results.svg" alt="" />
            <p>לא נמצאו חברים.</p>
          </div>
        )}

        {(phase === "ready" || phase === "refreshing" || (phase === "error" && items.length > 0)) &&
          items.length > 0 && (
            <ul className="member-list" aria-busy={phase === "refreshing"}>
              {items.map((member) => {
                const online = onlineIds.has(member.id) || member.online;
                const initial = (member.nickname || "?").slice(0, 1).toUpperCase();
                return (
                  <li key={member.id}>
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt="" width={44} height={44} />
                    ) : (
                      <span className="member-avatar-fallback" aria-hidden="true">
                        {initial}
                      </span>
                    )}
                    <div>
                      <strong>{member.nickname}</strong>
                      <span className={online ? "online" : "offline"}>
                        {online ? "מחובר/ת" : "לא מחובר/ת"}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
      </div>
    </section>
  );
}
