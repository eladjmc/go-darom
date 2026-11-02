import { Router } from "express";
import type { IdentityService } from "../../modules/identity/identity-service.js";
import { AuthError } from "../../modules/identity/token-verifier.js";
import type { GameChatService } from "../../modules/games/game-chat-service.js";
import type { GameService } from "../../modules/games/game-service.js";
import type { InvitationService } from "../../modules/games/invitation-service.js";
import type { GameProjection } from "@go-darom/shared";
import { createAuthMiddleware, requireActor, type AuthedRequest } from "../middleware/auth.js";

function sendAuthError(res: import("express").Response, err: AuthError) {
  const body: { error: string; code?: string; game?: GameProjection } = { error: err.message };
  const withGame = err as AuthError & { game?: GameProjection };
  if (withGame.game) body.game = withGame.game;
  if (err.code) body.code = err.code;
  else if (err.status === 409) body.code = "VERSION_CONFLICT";
  if (!body.code && err.message.includes("פגה")) body.code = "INVITE_EXPIRED";
  if (!body.code && err.message.includes("חסימה")) body.code = "BLOCKED";
  if (!body.code && err.message.includes("משחק חי")) body.code = "BUSY_LIVE";
  if (!body.code && err.message.includes("מזמין אינו מחובר")) body.code = "INVITER_UNAVAILABLE";
  res.status(err.status).json(body);
}

export function createGamesRouters(options: {
  identity: IdentityService;
  invites: InvitationService;
  games: GameService;
  gameChat: GameChatService;
}) {
  const auth = createAuthMiddleware(options.identity);
  const invitesRouter = Router();
  const gamesRouter = Router();

  invitesRouter.post("/invites/live", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      const invite = await options.invites.createLiveInvite(actor, req.body ?? {});
      res.status(201).json(invite);
    } catch (err) {
      if (err instanceof AuthError) return sendAuthError(res, err);
      throw err;
    }
  });

  invitesRouter.get("/invites/live/mine", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      res.json({ items: await options.invites.listMine(actor) });
    } catch (err) {
      if (err instanceof AuthError) return sendAuthError(res, err);
      throw err;
    }
  });

  invitesRouter.get("/invites/live/:inviteId", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      res.json(await options.invites.getForParticipant(actor, req.params.inviteId!));
    } catch (err) {
      if (err instanceof AuthError) return sendAuthError(res, err);
      throw err;
    }
  });

  invitesRouter.post("/invites/live/:inviteId/accept", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      const out = await options.invites.accept(actor, req.params.inviteId!);
      res.status(201).json(out);
    } catch (err) {
      if (err instanceof AuthError) return sendAuthError(res, err);
      throw err;
    }
  });

  invitesRouter.post("/invites/live/:inviteId/reject", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      res.json(await options.invites.reject(actor, req.params.inviteId!));
    } catch (err) {
      if (err instanceof AuthError) return sendAuthError(res, err);
      throw err;
    }
  });

  invitesRouter.post("/invites/live/:inviteId/cancel", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      res.json(await options.invites.cancel(actor, req.params.inviteId!));
    } catch (err) {
      if (err instanceof AuthError) return sendAuthError(res, err);
      throw err;
    }
  });

  gamesRouter.get("/games/active", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      res.json(await options.games.getActive(actor));
    } catch (err) {
      if (err instanceof AuthError) return sendAuthError(res, err);
      throw err;
    }
  });

  gamesRouter.get("/games/mine", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      const status = req.query.status === "finished" ? "finished" : "active";
      const cursor = typeof req.query.cursor === "string" ? req.query.cursor : null;
      const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
      res.json(await options.games.listMine(actor, status, { cursor, limit }));
    } catch (err) {
      if (err instanceof AuthError) return sendAuthError(res, err);
      throw err;
    }
  });

  gamesRouter.get("/games/:gameId", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      res.json(await options.games.getProjection(actor, req.params.gameId!));
    } catch (err) {
      if (err instanceof AuthError) return sendAuthError(res, err);
      throw err;
    }
  });

  gamesRouter.get("/games/:gameId/replay", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      const game = await options.games.getProjection(actor, req.params.gameId!);
      if (game.status !== "finished") {
        res.status(400).json({ error: "המשחק עדיין פעיל" });
        return;
      }
      res.json(game);
    } catch (err) {
      if (err instanceof AuthError) return sendAuthError(res, err);
      throw err;
    }
  });

  gamesRouter.post("/games/:gameId/commands", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      const game = await options.games.submitCommand(actor, req.params.gameId!, req.body ?? {});
      res.json({ game });
    } catch (err) {
      if (err instanceof AuthError) return sendAuthError(res, err);
      throw err;
    }
  });

  gamesRouter.get("/games/:gameId/chat", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      const before = typeof req.query.before === "string" ? req.query.before : null;
      const limit = typeof req.query.limit === "string" ? Number(req.query.limit) : undefined;
      const page = await options.gameChat.listMessages(actor, req.params.gameId!, before, limit);
      res.json(page);
    } catch (err) {
      if (err instanceof AuthError) return sendAuthError(res, err);
      throw err;
    }
  });

  gamesRouter.post("/games/:gameId/chat", auth, async (req: AuthedRequest, res) => {
    const actor = requireActor(req, res);
    if (!actor) return;
    try {
      const body = req.body ?? {};
      const out = await options.gameChat.postMessage(
        actor,
        req.params.gameId!,
        body.body,
        typeof body.clientCommandId === "string" ? body.clientCommandId : "",
      );
      res.status(out.created ? 201 : 200).json({ message: out.message });
    } catch (err) {
      if (err instanceof AuthError) return sendAuthError(res, err);
      throw err;
    }
  });

  return { invitesRouter, gamesRouter };
}
