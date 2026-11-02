import { Router } from "express";
import type { InvitationService } from "../../modules/games/invitation-service.js";
import type { IdentityService } from "../../modules/identity/identity-service.js";
import { AuthError } from "../../modules/identity/token-verifier.js";
import { createAuthMiddleware, requireActor, type AuthedRequest } from "../middleware/auth.js";

export function createMeRouter(identity: IdentityService, invites?: InvitationService): Router {
  const router = Router();
  const auth = createAuthMiddleware(identity);

  router.get("/me", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      const me = await identity.getMe(actor);
      res.json(me);
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      throw err;
    }
  });

  router.patch("/me", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      const me = await identity.patchMe(actor, req.body ?? {});
      res.json(me);
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      throw err;
    }
  });

  /** Explicit logout hook — cancels pending Live invites (OPEN-004). Not called on transient disconnect. */
  router.post("/me/logout", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      const cancelled = invites ? await invites.cancelPendingOnExplicitLogout(actor.userId) : 0;
      res.json({ ok: true, cancelledLiveInvites: cancelled });
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      throw err;
    }
  });

  return router;
}
