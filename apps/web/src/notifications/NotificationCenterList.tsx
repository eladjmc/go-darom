import { useCallback, useEffect, useState } from "react";
import type { NotificationDto } from "@go-darom/shared";
import {
  dismissNotifications,
  fetchNotifications,
  markNotificationsRead,
} from "../auth/community-api";
import { ApiError } from "../auth/api";
import { fetchGame, fetchLiveInvite } from "../play/play-api";
import { useRealtime } from "../realtime/RealtimeProvider";
import { NotificationRow } from "./NotificationRow";

async function gameIsFinished(token: string, gameId: string): Promise<boolean> {
  try {
    const game = await fetchGame(token, gameId);
    return game.status === "finished";
  } catch {
    return false;
  }
}

/** Invite / invite-accepted rows that should leave the center. */
async function findStaleInviteNotificationIds(
  token: string,
  items: NotificationDto[],
): Promise<string[]> {
  const stale: string[] = [];
  await Promise.all(
    items.map(async (n) => {
      if (n.type === "game.invite" && typeof n.payload.inviteId === "string") {
        try {
          const dto = await fetchLiveInvite(token, String(n.payload.inviteId));
          if (dto.status !== "pending" || new Date(dto.expiresAt).getTime() <= Date.now()) {
            stale.push(n.id);
            return;
          }
        } catch (err) {
          if (err instanceof ApiError && (err.status === 404 || err.status === 410)) {
            stale.push(n.id);
          }
        }
        return;
      }
      if (
        (n.type === "game.invite_accepted" || n.type === "game.live_turn") &&
        typeof n.payload.gameId === "string"
      ) {
        if (await gameIsFinished(token, n.payload.gameId)) stale.push(n.id);
      }
    }),
  );
  return stale;
}

type Props = {
  token: string;
  focusInviteId?: string | null;
  onNavigate?: () => void;
  compact?: boolean;
};

export function NotificationCenterList({ token, focusInviteId, onNavigate }: Props) {
  const { refreshNotificationBadge, socket } = useRealtime();
  const [items, setItems] = useState<NotificationDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(id);
  }, []);

  const dismissMany = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      setItems((prev) => prev.filter((n) => !idSet.has(n.id)));
      try {
        await dismissNotifications(token, { ids });
        refreshNotificationBadge();
      } catch {
        try {
          const res = await fetchNotifications(token);
          setItems(res.items.filter((n) => n.type !== "dm.message"));
        } catch {
          /* keep optimistic removal */
        }
      }
    },
    [token, refreshNotificationBadge],
  );

  useEffect(() => {
    let cancelled = false;
    setPhase("loading");
    void (async () => {
      try {
        const res = await fetchNotifications(token);
        if (cancelled) return;
        let system = res.items.filter((n) => n.type !== "dm.message");
        const stale = await findStaleInviteNotificationIds(token, system);
        if (cancelled) return;
        if (stale.length > 0) {
          const staleSet = new Set(stale);
          system = system.filter((n) => !staleSet.has(n.id));
          void dismissNotifications(token, { ids: stale }).catch(() => undefined);
        }
        setItems(system);
        setPhase("ready");
        const unreadIds = system.filter((n) => !n.readAt).map((n) => n.id);
        if (unreadIds.length > 0) {
          await markNotificationsRead(token, { ids: unreadIds });
          if (!cancelled) {
            const stamped = new Date().toISOString();
            setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: stamped })));
            refreshNotificationBadge();
          }
        } else {
          refreshNotificationBadge();
        }
      } catch (err: unknown) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "טעינה נכשלה");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token, refreshNotificationBadge]);

  useEffect(() => {
    if (!socket) return;
    const onNotif = (n: NotificationDto) => {
      if (n.type === "dm.message") return;
      if (
        (n.type === "game.invite_accepted" ||
          n.type === "game.invite_rejected" ||
          n.type === "game.invite_cancelled") &&
        typeof n.payload.inviteId === "string"
      ) {
        const inviteId = n.payload.inviteId;
        setItems((prev) => {
          const staleIds = prev
            .filter((x) => x.type === "game.invite" && x.payload.inviteId === inviteId)
            .map((x) => x.id);
          if (staleIds.length > 0) {
            void dismissNotifications(token, { ids: staleIds }).catch(() => undefined);
            refreshNotificationBadge();
          }
          const without = prev.filter((x) => !staleIds.includes(x.id));
          return without.some((x) => x.id === n.id) ? without : [n, ...without];
        });
        return;
      }
      setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
    };
    const onDismissed = (payload: { ids?: string[] }) => {
      const ids = new Set(payload?.ids ?? []);
      if (ids.size === 0) return;
      setItems((prev) => prev.filter((n) => !ids.has(n.id)));
      refreshNotificationBadge();
    };
    socket.on("notification:created", onNotif);
    socket.on("notification:toast", onNotif);
    socket.on("notification:dismissed", onDismissed);
    return () => {
      socket.off("notification:created", onNotif);
      socket.off("notification:toast", onNotif);
      socket.off("notification:dismissed", onDismissed);
    };
  }, [socket, refreshNotificationBadge, token]);

  useEffect(() => {
    if (!focusInviteId || phase !== "ready") return;
    const el = document.querySelector(`[data-invite-id="${CSS.escape(focusInviteId)}"]`);
    el?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [focusInviteId, items, phase]);

  const dismiss = async (id: string) => {
    await dismissMany([id]);
  };

  return (
    <div className="notif-center-list is-compact">
      {error ? (
        <p className="notif-center-error" role="alert">
          {error}
        </p>
      ) : null}
      {phase === "loading" ? <p className="notif-center-empty">טוענים התראות…</p> : null}
      {phase === "ready" && items.length === 0 ? (
        <p className="notif-center-empty">אין התראות כרגע.</p>
      ) : null}

      {items.length > 0 ? (
        <ul className="notif-row-list" aria-label="רשימת התראות">
          {items.map((n) => (
            <NotificationRow
              key={n.id}
              token={token}
              notification={n}
              now={now}
              defaultExpanded={
                Boolean(focusInviteId) && focusInviteId === String(n.payload.inviteId ?? "")
              }
              onDismiss={(id) => void dismiss(id)}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}
