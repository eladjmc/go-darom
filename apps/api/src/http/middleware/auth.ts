import type { NextFunction, Request, Response } from "express";
import type { IdentityService } from "../../modules/identity/identity-service.js";
import { AuthError } from "../../modules/identity/token-verifier.js";
import type { AuthenticatedActor } from "../../modules/identity/types.js";

export type AuthedRequest = Request & { actor?: AuthenticatedActor };

export function createAuthMiddleware(identity: IdentityService) {
  return async (req: AuthedRequest, res: Response, next: NextFunction) => {
    try {
      req.actor = await identity.authenticate(req.header("authorization") ?? undefined);
      next();
    } catch (err) {
      if (err instanceof AuthError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      next(err);
    }
  };
}

export function requireActor(req: AuthedRequest, res: Response): AuthenticatedActor | null {
  if (!req.actor) {
    res.status(401).json({ error: "נדרשת התחברות" });
    return null;
  }
  return req.actor;
}
