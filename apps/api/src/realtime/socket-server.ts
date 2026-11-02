import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { ChatService } from "../modules/chat/chat-service.js";
import {
  gameChatRoomName,
  type GameChatService,
} from "../modules/games/game-chat-service.js";
import type { GameService } from "../modules/games/game-service.js";
import type { IdentityService } from "../modules/identity/identity-service.js";
import { AuthError } from "../modules/identity/token-verifier.js";
import type { NotificationService } from "../modules/notifications/notification-service.js";
import type { PresenceRegistry } from "./presence-registry.js";

export function attachSocketServer(options: {
  httpServer: HttpServer;
  webOrigin: string;
  identity: IdentityService;
  presence: PresenceRegistry;
  chat: ChatService;
  notifications: NotificationService;
  games?: GameService;
  gameChat?: GameChatService;
}) {
  const io = new Server(options.httpServer, {
    cors: { origin: options.webOrigin },
  });

  /** userIds currently joined to each game room (multi-tab = multiple sockets). */
  const gameRoomUsers = new Map<string, Set<string>>();

  options.presence.setOfflineHandler((userId) => {
    io.emit("presence:user", { userId, online: false });
  });

  options.chat.setBroadcast((room, event, payload) => {
    io.to(room).emit(event, payload);
  });

  options.notifications.setEmitter((recipientId, notification, toast) => {
    io.to(`user:${recipientId}`).emit("notification:created", notification);
    if (toast) {
      io.to(`user:${recipientId}`).emit("notification:toast", notification);
    }
  });
  options.notifications.setDismissEmitter((recipientId, ids) => {
    io.to(`user:${recipientId}`).emit("notification:dismissed", { ids });
  });

  if (options.games) {
    options.games.setBroadcast((gameId, event, payload) => {
      io.to(`game:${gameId}`).emit(event, payload);
    });
    options.games.setRoomMembers((gameId) => [...(gameRoomUsers.get(gameId) ?? [])]);
  }

  if (options.gameChat) {
    options.gameChat.setBroadcast((gameId, event, payload) => {
      io.to(gameChatRoomName(gameId)).emit(event, payload);
    });
  }

  io.use(async (socket, next) => {
    try {
      const token =
        (typeof socket.handshake.auth?.token === "string" && socket.handshake.auth.token) ||
        (typeof socket.handshake.headers.authorization === "string"
          ? socket.handshake.headers.authorization
          : undefined);
      const header = token?.startsWith("Bearer ") ? token : token ? `Bearer ${token}` : undefined;
      const actor = await options.identity.authenticate(header);
      await options.identity.requireOnboarded(actor);
      socket.data.userId = actor.userId;
      socket.data.actor = actor;
      next();
    } catch (err) {
      if (err instanceof AuthError) {
        next(new Error(err.message));
        return;
      }
      next(err as Error);
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.data.userId as string;
    const becameOnline = options.presence.connect(userId);
    void socket.join(`user:${userId}`);
    if (becameOnline) {
      io.emit("presence:user", { userId, online: true });
    }
    socket.emit("presence:snapshot", {
      onlineUserIds: options.presence.onlineUserIds(),
    });

    socket.on("chat:join", async (payload: { room?: string | { dmThreadId: string } }, ack?: (r: unknown) => void) => {
      try {
        const actor = socket.data.actor;
        if (payload?.room === "community") {
          await socket.join("chat:community");
          ack?.({ ok: true });
          return;
        }
        if (payload?.room && typeof payload.room === "object" && payload.room.dmThreadId) {
          await options.chat.assertDmParticipant(actor.userId, payload.room.dmThreadId);
          await socket.join(`dm:${payload.room.dmThreadId}`);
          ack?.({ ok: true });
          return;
        }
        ack?.({ ok: false, error: "חדר אינו תקין" });
      } catch (err) {
        ack?.({ ok: false, error: err instanceof Error ? err.message : "שגיאה" });
      }
    });

    socket.on("chat:leave", async (payload: { room?: string | { dmThreadId: string } }) => {
      if (payload?.room === "community") {
        await socket.leave("chat:community");
        return;
      }
      if (payload?.room && typeof payload.room === "object" && payload.room.dmThreadId) {
        await socket.leave(`dm:${payload.room.dmThreadId}`);
      }
    });

    socket.on("game:join", async (payload: { gameId?: string }, ack?: (r: unknown) => void) => {
      try {
        if (!options.games || !payload?.gameId) {
          ack?.({ ok: false, error: "משחק אינו תקין" });
          return;
        }
        await options.games.getProjection(socket.data.actor, payload.gameId);
        await socket.join(`game:${payload.gameId}`);
        socket.data.gameId = payload.gameId;
        let set = gameRoomUsers.get(payload.gameId);
        if (!set) {
          set = new Set();
          gameRoomUsers.set(payload.gameId, set);
        }
        set.add(userId);
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err instanceof Error ? err.message : "שגיאה" });
      }
    });

    socket.on("game:leave", async (payload: { gameId?: string }) => {
      const gameId = payload?.gameId ?? (socket.data.gameId as string | undefined);
      if (!gameId) return;
      await socket.leave(`game:${gameId}`);
      const set = gameRoomUsers.get(gameId);
      if (set) {
        // Only remove user if no other sockets for same user remain in room
        const sockets = await io.in(`game:${gameId}`).fetchSockets();
        const stillHere = sockets.some((s) => s.id !== socket.id && s.data.userId === userId);
        if (!stillHere) set.delete(userId);
        if (set.size === 0) gameRoomUsers.delete(gameId);
      }
    });

    socket.on("game-chat:join", async (payload: { gameId?: string }, ack?: (r: unknown) => void) => {
      try {
        if (!options.gameChat || !payload?.gameId) {
          ack?.({ ok: false, error: "צ'אט משחק אינו זמין" });
          return;
        }
        await options.gameChat.assertCanJoin(socket.data.actor, payload.gameId);
        await socket.join(gameChatRoomName(payload.gameId));
        socket.data.gameChatId = payload.gameId;
        ack?.({ ok: true });
      } catch (err) {
        ack?.({ ok: false, error: err instanceof Error ? err.message : "שגיאה" });
      }
    });

    socket.on("game-chat:leave", async (payload: { gameId?: string }) => {
      const gameId = payload?.gameId ?? (socket.data.gameChatId as string | undefined);
      if (!gameId) return;
      await socket.leave(gameChatRoomName(gameId));
    });

    socket.on("disconnect", () => {
      const gameId = socket.data.gameId as string | undefined;
      if (gameId) {
        const set = gameRoomUsers.get(gameId);
        set?.delete(userId);
        if (set && set.size === 0) gameRoomUsers.delete(gameId);
      }
      options.presence.disconnect(userId);
    });
  });

  return io;
}
