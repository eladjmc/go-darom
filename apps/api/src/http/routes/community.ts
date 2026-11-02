import { Router } from "express";
import type { ChatService } from "../../modules/chat/chat-service.js";
import type { IdentityService } from "../../modules/identity/identity-service.js";
import { AuthError } from "../../modules/identity/token-verifier.js";
import type { ModerationService } from "../../modules/trust/moderation-service.js";
import type { NotificationService } from "../../modules/notifications/notification-service.js";
import type { TrustService } from "../../modules/trust/trust-service.js";
import { createAuthMiddleware, requireActor, type AuthedRequest } from "../middleware/auth.js";

function handleAuthError(err: unknown, res: import("express").Response) {
  if (err instanceof AuthError) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  return false;
}

export function createCommunityRouters(deps: {
  identity: IdentityService;
  chat: ChatService;
  trust: TrustService;
  notifications: NotificationService;
  moderation: ModerationService;
}) {
  const auth = createAuthMiddleware(deps.identity);
  const chatRouter = Router();
  const dmRouter = Router();
  const blockRouter = Router();
  const reportRouter = Router();
  const notificationRouter = Router();
  const adminModRouter = Router();

  chatRouter.get("/chat/community/messages", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      await deps.identity.requireOnboarded(actor);
      const beforeSeq = req.query.beforeSeq ? Number(req.query.beforeSeq) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      res.json(await deps.chat.listCommunityMessages(beforeSeq, limit));
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  chatRouter.post("/chat/community/messages", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      await deps.identity.requireOnboarded(actor);
      const message = await deps.chat.postCommunityMessage(
        actor,
        req.body?.body,
        String(req.body?.clientCommandId ?? ""),
      );
      res.json({ message });
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  chatRouter.post("/chat/community/read", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      await deps.identity.requireOnboarded(actor);
      res.json(await deps.chat.markCommunityRead(actor, Number(req.body?.lastReadSeq)));
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  chatRouter.delete("/chat/community/messages/:id", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      const me = await deps.identity.requireOnboarded(actor);
      res.json(await deps.chat.softDeleteMessage(actor, req.params.id, me.role === "admin"));
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  dmRouter.get("/dms/unread-total", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      await deps.identity.requireOnboarded(actor);
      res.json({ total: await deps.chat.totalDmUnread(actor.userId) });
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  dmRouter.get("/dms/threads", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      await deps.identity.requireOnboarded(actor);
      res.json({ items: await deps.chat.listDmThreads(actor) });
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  dmRouter.post("/dms/threads", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      await deps.identity.requireOnboarded(actor);
      res.json(await deps.chat.getOrCreateDmThread(actor, String(req.body?.peerUserId ?? "")));
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  dmRouter.get("/dms/threads/:threadId/messages", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      await deps.identity.requireOnboarded(actor);
      const beforeSeq = req.query.beforeSeq ? Number(req.query.beforeSeq) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      res.json(await deps.chat.listDmMessages(actor, req.params.threadId, beforeSeq, limit));
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  dmRouter.post("/dms/threads/:threadId/messages", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      await deps.identity.requireOnboarded(actor);
      const message = await deps.chat.postDmMessage(
        actor,
        req.params.threadId,
        req.body?.body,
        String(req.body?.clientCommandId ?? ""),
      );
      res.json({ message });
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  dmRouter.post("/dms/threads/:threadId/read", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      await deps.identity.requireOnboarded(actor);
      res.json(await deps.chat.markDmRead(actor, req.params.threadId, Number(req.body?.lastReadSeq)));
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  blockRouter.get("/me/blocks", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      await deps.identity.requireOnboarded(actor);
      res.json({ items: await deps.trust.listBlocks(actor) });
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  blockRouter.post("/me/blocks", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      await deps.identity.requireOnboarded(actor);
      res.json({ items: await deps.trust.block(actor, String(req.body?.userId ?? "")) });
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  blockRouter.delete("/me/blocks/:userId", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      await deps.identity.requireOnboarded(actor);
      res.json({ items: await deps.trust.unblock(actor, req.params.userId) });
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  reportRouter.post("/reports", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      await deps.identity.requireOnboarded(actor);
      res.json(
        await deps.moderation.createReport(actor, {
          targetType: req.body?.targetType,
          messageId: String(req.body?.messageId ?? ""),
          reason: String(req.body?.reason ?? ""),
        }),
      );
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  notificationRouter.get("/notifications", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      await deps.identity.requireOnboarded(actor);
      const cursor = typeof req.query.cursor === "string" ? req.query.cursor : undefined;
      res.json(await deps.notifications.list(actor, cursor));
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  notificationRouter.get("/notifications/unread-count", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      await deps.identity.requireOnboarded(actor);
      res.json({ total: await deps.notifications.countSystemUnread(actor.userId) });
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  notificationRouter.post("/notifications/read", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      await deps.identity.requireOnboarded(actor);
      res.json(await deps.notifications.markRead(actor, req.body ?? {}));
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  notificationRouter.post("/notifications/dismiss", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      await deps.identity.requireOnboarded(actor);
      res.json(await deps.notifications.dismiss(actor, req.body ?? {}));
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  adminModRouter.get("/admin/reports", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      const status = typeof req.query.status === "string" ? (req.query.status as "open" | "resolved" | "dismissed") : undefined;
      res.json(await deps.moderation.listReports(actor, status));
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  adminModRouter.get("/admin/reports/:id", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      res.json(await deps.moderation.getReport(actor, req.params.id));
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  adminModRouter.post("/admin/reports/:id/resolve", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      res.json(
        await deps.moderation.resolveReport(actor, req.params.id, {
          resolution: req.body?.resolution,
          note: req.body?.note,
        }),
      );
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  adminModRouter.post("/admin/users/:id/suspend", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      res.json(await deps.moderation.suspendUser(actor, req.params.id, String(req.body?.reason ?? "")));
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  adminModRouter.post("/admin/users/:id/unsuspend", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      res.json(await deps.moderation.unsuspendUser(actor, req.params.id, String(req.body?.reason ?? "")));
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  adminModRouter.delete("/admin/chat/messages/:id", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      deps.identity.requireAdmin(actor);
      res.json(await deps.chat.softDeleteMessage(actor, req.params.id, true));
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  return { chatRouter, dmRouter, blockRouter, reportRouter, notificationRouter, adminModRouter };
}
