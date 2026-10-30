import { Router } from "express";
import type { IdentityService } from "../../modules/identity/identity-service.js";
import { AuthError } from "../../modules/identity/token-verifier.js";
import { createAuthMiddleware, requireActor, type AuthedRequest } from "../middleware/auth.js";

export function createMembersRouter(identity: IdentityService): Router {
  const router = Router();
  const auth = createAuthMiddleware(identity);

  router.get("/members", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const onlineRaw = typeof req.query.online === "string" ? req.query.online : "";
      const onlineOnly = onlineRaw === "1" || onlineRaw.toLowerCase() === "true";
      const body = await identity.listMembers(actor, q, onlineOnly);
      res.json(body);
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
