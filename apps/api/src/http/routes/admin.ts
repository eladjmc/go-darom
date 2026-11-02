import { Router } from "express";
import type { IdentityService } from "../../modules/identity/identity-service.js";
import { AuthError } from "../../modules/identity/token-verifier.js";
import type { ModerationService } from "../../modules/trust/moderation-service.js";
import { createAuthMiddleware, requireActor, type AuthedRequest } from "../middleware/auth.js";

function handleAuthError(err: unknown, res: import("express").Response): boolean {
  if (err instanceof AuthError) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  return false;
}

export function createAdminRouter(identity: IdentityService, moderation: ModerationService): Router {
  const router = Router();
  const auth = createAuthMiddleware(identity);

  router.get("/admin/session", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      identity.requireAdmin(actor);
      res.json({ ok: true, role: actor.role });
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  router.get("/admin/overview", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      res.json(await moderation.getOverview(actor));
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  router.get("/admin/members", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const statusRaw = typeof req.query.status === "string" ? req.query.status : "all";
      const status =
        statusRaw === "active" || statusRaw === "suspended" || statusRaw === "all" ? statusRaw : "all";
      res.json(await moderation.listAdminMembers(actor, { q, status }));
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  router.get("/admin/audit", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 50;
      res.json(await moderation.listAudit(actor, Number.isFinite(limit) ? limit : 50));
    } catch (err) {
      if (!handleAuthError(err, res)) throw err;
    }
  });

  return router;
}
