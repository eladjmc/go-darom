import { and, eq, or } from "drizzle-orm";
import type { Db } from "../../infra/db/client.js";
import { userBlocks, users } from "../../infra/db/schema.js";
import { AuthError } from "../identity/token-verifier.js";
import type { AuthenticatedActor } from "../identity/types.js";

export class TrustService {
  constructor(private readonly db: Db["db"]) {}

  async isEitherBlocked(a: string, b: string): Promise<boolean> {
    const rows = await this.db
      .select({ id: userBlocks.id })
      .from(userBlocks)
      .where(
        or(
          and(eq(userBlocks.blockerId, a), eq(userBlocks.blockedId, b)),
          and(eq(userBlocks.blockerId, b), eq(userBlocks.blockedId, a)),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }

  /** Shared gate for DMs and future invitations (COMM-003). */
  async assertCanDirectContact(actorId: string, peerId: string) {
    if (actorId === peerId) {
      throw new AuthError("לא ניתן ליצור קשר עם עצמכם", 400);
    }
    if (await this.isEitherBlocked(actorId, peerId)) {
      throw new AuthError("לא ניתן ליצור קשר — קיימת חסימה בין המשתמשים", 403);
    }
  }

  async listBlocks(actor: AuthenticatedActor) {
    const rows = await this.db
      .select({
        id: users.id,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
      })
      .from(userBlocks)
      .innerJoin(users, eq(users.id, userBlocks.blockedId))
      .where(eq(userBlocks.blockerId, actor.userId));
    return rows
      .filter((r) => r.nickname)
      .map((r) => ({
        id: r.id,
        nickname: r.nickname as string,
        avatarUrl: r.avatarUrl,
      }));
  }

  async block(actor: AuthenticatedActor, targetUserId: string) {
    if (actor.userId === targetUserId) {
      throw new AuthError("לא ניתן לחסום את עצמכם", 400);
    }
    const target = await this.db.select({ id: users.id }).from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!target[0]) throw new AuthError("משתמש לא נמצא", 404);
    await this.db
      .insert(userBlocks)
      .values({ blockerId: actor.userId, blockedId: targetUserId })
      .onConflictDoNothing();
    return this.listBlocks(actor);
  }

  async unblock(actor: AuthenticatedActor, targetUserId: string) {
    await this.db
      .delete(userBlocks)
      .where(and(eq(userBlocks.blockerId, actor.userId), eq(userBlocks.blockedId, targetUserId)));
    return this.listBlocks(actor);
  }
}
