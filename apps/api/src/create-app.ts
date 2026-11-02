import cors from "cors";
import express from "express";
import type { HealthService } from "./app/health-service.js";
import type { ChatService } from "./modules/chat/chat-service.js";
import type { IdentityService } from "./modules/identity/identity-service.js";
import type { NotificationService } from "./modules/notifications/notification-service.js";
import type { GameChatService } from "./modules/games/game-chat-service.js";
import type { GameService } from "./modules/games/game-service.js";
import type { InvitationService } from "./modules/games/invitation-service.js";
import type { ModerationService } from "./modules/trust/moderation-service.js";
import type { TrustService } from "./modules/trust/trust-service.js";
import { createAdminRouter } from "./http/routes/admin.js";
import { createCommunityRouters } from "./http/routes/community.js";
import { createGamesRouters } from "./http/routes/games.js";
import { createHealthRouter } from "./http/routes/health.js";
import { createMeRouter } from "./http/routes/me.js";
import { createMembersRouter } from "./http/routes/members.js";

export function createApp(options: {
  healthService: HealthService;
  identityService: IdentityService;
  chatService: ChatService;
  trustService: TrustService;
  notificationService: NotificationService;
  moderationService: ModerationService;
  invitationService: InvitationService;
  gameService: GameService;
  gameChatService: GameChatService;
  webOrigin: string;
}) {
  const app = express();
  app.use(cors({ origin: options.webOrigin }));
  app.use(express.json({ limit: "100kb" }));
  app.use(createHealthRouter(options.healthService));
  app.use(createMeRouter(options.identityService, options.invitationService));
  app.use(createMembersRouter(options.identityService));
  app.use(createAdminRouter(options.identityService, options.moderationService));

  const community = createCommunityRouters({
    identity: options.identityService,
    chat: options.chatService,
    trust: options.trustService,
    notifications: options.notificationService,
    moderation: options.moderationService,
  });
  app.use(community.chatRouter);
  app.use(community.dmRouter);
  app.use(community.blockRouter);
  app.use(community.reportRouter);
  app.use(community.notificationRouter);
  app.use(community.adminModRouter);

  const play = createGamesRouters({
    identity: options.identityService,
    invites: options.invitationService,
    games: options.gameService,
    gameChat: options.gameChatService,
  });
  app.use(play.invitesRouter);
  app.use(play.gamesRouter);

  return app;
}
