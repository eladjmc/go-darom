import type { MeProfile } from "@go-darom/shared";
import { validateNickname } from "@go-darom/shared";
import type { PresenceRegistry } from "../../realtime/presence-registry.js";
import { AuthError, type TokenVerifier } from "./token-verifier.js";
import type { AuthenticatedActor, UserRole } from "./types.js";
import type { UserRepository } from "./user-repository.js";

export class IdentityService {
  constructor(
    private readonly users: UserRepository,
    private readonly tokens: TokenVerifier,
    private readonly presence: PresenceRegistry,
    private readonly bootstrapAdminClerkIds: Set<string>,
  ) {}

  async authenticate(authorizationHeader: string | undefined): Promise<AuthenticatedActor> {
    const verified = await this.tokens.verify(authorizationHeader);
    let user = await this.users.findByClerkId(verified.clerkUserId);
    const listedForBootstrap = this.bootstrapAdminClerkIds.has(verified.clerkUserId);

    if (!user) {
      const role: UserRole = listedForBootstrap ? "admin" : "member";
      user = await this.users.createWithClerkIdentity({
        clerkUserId: verified.clerkUserId,
        nickname: verified.suggestedNickname ?? null,
        avatarUrl: verified.suggestedAvatarUrl ?? null,
        role,
      });
      if (role === "admin") {
        await this.users.recordAdminBootstrapAudit(user.id, {
          source: "BOOTSTRAP_ADMIN_CLERK_IDS",
          clerkUserId: verified.clerkUserId,
          path: "create",
        });
      }
    } else if (user.role === "member" && listedForBootstrap) {
      const promoted = await this.users.promoteBootstrapAdmin(user.id, {
        source: "BOOTSTRAP_ADMIN_CLERK_IDS",
        clerkUserId: verified.clerkUserId,
        path: "existing",
      });
      if (promoted) {
        user = { ...user, role: "admin" };
      }
    }

    if (user.suspendedAt) {
      throw new AuthError("החשבון מושעה", 403);
    }

    return {
      userId: user.id,
      clerkUserId: verified.clerkUserId,
      role: user.role,
      suspended: false,
    };
  }

  async getMe(actor: AuthenticatedActor): Promise<MeProfile> {
    const user = await this.users.findByClerkId(actor.clerkUserId);
    if (!user) {
      throw new AuthError("משתמש לא נמצא", 404);
    }
    return {
      id: user.id,
      nickname: user.nickname,
      avatarUrl: user.avatarUrl,
      role: user.role,
      onboardingCompleted: user.onboardingCompleted,
      suspended: Boolean(user.suspendedAt),
    };
  }

  async patchMe(
    actor: AuthenticatedActor,
    body: {
      nickname?: string;
      avatarUrl?: string | null;
      completeOnboarding?: boolean;
    },
  ): Promise<MeProfile> {
    const patch: {
      nickname?: string;
      avatarUrl?: string | null;
      onboardingCompleted?: boolean;
    } = {};

    if (body.nickname !== undefined) {
      const result = validateNickname(body.nickname);
      if (!result.ok) {
        throw new AuthError(result.message, 400);
      }
      patch.nickname = result.nickname;
    }
    if (body.avatarUrl !== undefined) {
      patch.avatarUrl = body.avatarUrl;
    }
    if (body.completeOnboarding) {
      const current = await this.getMe(actor);
      const nickname = patch.nickname ?? current.nickname;
      if (!nickname) {
        throw new AuthError("יש לבחור כינוי לפני סיום ההרשמה", 400);
      }
      if (patch.nickname === undefined) {
        const result = validateNickname(nickname);
        if (!result.ok) {
          throw new AuthError(result.message, 400);
        }
      }
      patch.onboardingCompleted = true;
    }

    const updated = await this.users.updateProfile(actor.userId, patch);
    if (!updated) {
      throw new AuthError("משתמש לא נמצא", 404);
    }
    return {
      id: updated.id,
      nickname: updated.nickname,
      avatarUrl: updated.avatarUrl,
      role: updated.role,
      onboardingCompleted: updated.onboardingCompleted,
      suspended: Boolean(updated.suspendedAt),
    };
  }

  async requireOnboarded(actor: AuthenticatedActor) {
    const me = await this.getMe(actor);
    if (!me.onboardingCompleted) {
      throw new AuthError("יש להשלים את ההרשמה", 403);
    }
    if (me.suspended) {
      throw new AuthError("החשבון מושעה", 403);
    }
    return me;
  }

  async listMembers(actor: AuthenticatedActor, q?: string, onlineOnly = false) {
    await this.requireOnboarded(actor);
    const rows = await this.users.listMembers(q);
    let items = rows.map((row) => ({
      id: row.id,
      nickname: row.nickname,
      avatarUrl: row.avatarUrl,
      online: this.presence.isOnline(row.id),
    }));
    if (onlineOnly) {
      items = items.filter((i) => i.online);
    }
    return { items };
  }

  requireAdmin(actor: AuthenticatedActor) {
    if (actor.role !== "admin") {
      throw new AuthError("אין הרשאה", 403);
    }
  }
}
