import { createServer } from "node:http";
import { HealthService } from "./app/health-service.js";
import { loadEnv } from "./config/env.js";
import { createApp } from "./create-app.js";
import { createDb } from "./infra/db/client.js";
import { ChatService } from "./modules/chat/chat-service.js";
import { GameChatService } from "./modules/games/game-chat-service.js";
import { GameService } from "./modules/games/game-service.js";
import { InvitationService } from "./modules/games/invitation-service.js";
import { ClerkTokenVerifier } from "./modules/identity/clerk-token-verifier.js";
import { IdentityService } from "./modules/identity/identity-service.js";
import { DevStubTokenVerifier } from "./modules/identity/token-verifier.js";
import { UserRepository } from "./modules/identity/user-repository.js";
import { NotificationService } from "./modules/notifications/notification-service.js";
import { ModerationService } from "./modules/trust/moderation-service.js";
import { TrustService } from "./modules/trust/trust-service.js";
import { PresenceRegistry } from "./realtime/presence-registry.js";
import { attachSocketServer } from "./realtime/socket-server.js";

async function main() {
  const env = loadEnv();
  const { db, pool } = createDb(env.databaseUrl);
  const healthService = new HealthService(pool, env.version);
  const presence = new PresenceRegistry();
  const users = new UserRepository(db);

  if (!env.identityDevStub && !env.clerkSecretKey) {
    console.warn(
      "[identity] CLERK_SECRET_KEY missing — set IDENTITY_DEV_STUB=true for local stub auth, or configure Clerk.",
    );
  }

  const tokens = env.identityDevStub
    ? new DevStubTokenVerifier()
    : new ClerkTokenVerifier(env.clerkSecretKey);

  const identityService = new IdentityService(
    users,
    tokens,
    presence,
    new Set(env.bootstrapAdminClerkIds),
  );

  const trustService = new TrustService(db);
  const notificationService = new NotificationService(db);
  const chatService = new ChatService(db, trustService, notificationService);
  await chatService.ensureCommunityThread();
  const moderationService = new ModerationService(db, chatService, identityService);
  const gameService = new GameService(db, notificationService, presence);
  const gameChatService = new GameChatService(db);
  const invitationService = new InvitationService(
    db,
    trustService,
    notificationService,
    presence,
    gameService,
  );

  const app = createApp({
    healthService,
    identityService,
    chatService,
    trustService,
    notificationService,
    moderationService,
    invitationService,
    gameService,
    gameChatService,
    webOrigin: env.webOrigin,
  });
  const httpServer = createServer(app);
  attachSocketServer({
    httpServer,
    webOrigin: env.webOrigin,
    identity: identityService,
    presence,
    chat: chatService,
    notifications: notificationService,
    games: gameService,
    gameChat: gameChatService,
  });

  httpServer.listen(env.apiPort, () => {
    console.log(`Go Darom API listening on :${env.apiPort}`);
    if (env.identityDevStub) {
      console.log("[identity] DEV stub enabled — Authorization: Bearer stub:<clerkUserId>");
    }
  });

  const shutdown = async () => {
    httpServer.close();
    await pool.end();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
