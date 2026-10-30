import { and, asc, eq, ilike, isNull, sql } from "drizzle-orm";
import type { Db } from "../../infra/db/client.js";
import { authIdentities, users } from "../../infra/db/schema.js";
import type { UserRole } from "./types.js";

export class UserRepository {
  constructor(private readonly db: Db["db"]) {}

  async findByClerkId(clerkUserId: string) {
    const rows = await this.db
      .select({
        id: users.id,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
        role: users.role,
        onboardingCompleted: users.onboardingCompleted,
        suspendedAt: users.suspendedAt,
      })
      .from(authIdentities)
      .innerJoin(users, eq(users.id, authIdentities.userId))
      .where(and(eq(authIdentities.provider, "clerk"), eq(authIdentities.externalId, clerkUserId)))
      .limit(1);
    return rows[0] ?? null;
  }

  async createWithClerkIdentity(input: {
    clerkUserId: string;
    nickname: string | null;
    avatarUrl: string | null;
    role: UserRole;
  }) {
    return this.db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          nickname: input.nickname,
          avatarUrl: input.avatarUrl,
          role: input.role,
          onboardingCompleted: false,
        })
        .returning();
      await tx.insert(authIdentities).values({
        userId: user.id,
        provider: "clerk",
        externalId: input.clerkUserId,
      });
      return user;
    });
  }

  async updateProfile(
    userId: string,
    patch: {
      nickname?: string;
      avatarUrl?: string | null;
      onboardingCompleted?: boolean;
    },
  ) {
    const [row] = await this.db
      .update(users)
      .set({
        ...(patch.nickname !== undefined ? { nickname: patch.nickname } : {}),
        ...(patch.avatarUrl !== undefined ? { avatarUrl: patch.avatarUrl } : {}),
        ...(patch.onboardingCompleted !== undefined
          ? { onboardingCompleted: patch.onboardingCompleted }
          : {}),
        updatedAt: sql`now()`,
      })
      .where(eq(users.id, userId))
      .returning();
    return row;
  }

  async listMembers(query: string | undefined, limit = 50) {
    const q = query?.trim();
    const rows = await this.db
      .select({
        id: users.id,
        nickname: users.nickname,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(
        and(
          isNull(users.suspendedAt),
          sql`${users.onboardingCompleted} = true`,
          sql`${users.nickname} is not null`,
          q ? ilike(users.nickname, `%${q}%`) : sql`true`,
        ),
      )
      .orderBy(asc(users.nickname), asc(users.id))
      .limit(limit);
    return rows.filter((r): r is typeof r & { nickname: string } => Boolean(r.nickname));
  }

  async touchLastSeen(userId: string) {
    await this.db.update(users).set({ lastSeenAt: sql`now()` }).where(eq(users.id, userId));
  }
}
