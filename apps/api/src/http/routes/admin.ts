import { Router } from "express";
import type { IdentityService } from "../../modules/identity/identity-service.js";
import { AuthError } from "../../modules/identity/token-verifier.js";
import { createAuthMiddleware, requireActor, type AuthedRequest } from "../middleware/auth.js";

export function createAdminRouter(identity: IdentityService): Router {
  const router = Router();
  const auth = createAuthMiddleware(identity);

  router.get("/admin/session", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      identity.requireAdmin(actor);
      res.json({ ok: true, role: actor.role });
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
