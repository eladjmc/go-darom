import type { Server as HttpServer } from "node:http";
import { Server } from "socket.io";
import type { ChatService } from "../modules/chat/chat-service.js";
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
}) {
  const io = new Server(options.httpServer, {
    cors: { origin: options.webOrigin },
  });

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

    socket.on("disconnect", () => {
      options.presence.disconnect(userId);
    });
  });

  return io;
}
