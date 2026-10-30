import { describe, expect, it, vi } from "vitest";
import { PresenceRegistry } from "../../realtime/presence-registry.js";
import { IdentityService } from "./identity-service.js";
import type { TokenVerifier } from "./token-verifier.js";
import type { UserRepository } from "./user-repository.js";

function mockUsers(overrides: Partial<UserRepository> = {}): UserRepository {
  return {
    findByClerkId: vi.fn(),
    createWithClerkIdentity: vi.fn(),
    updateProfile: vi.fn(),
    listMembers: vi.fn(),
    touchLastSeen: vi.fn(),
    ...overrides,
  } as unknown as UserRepository;
}

describe("IdentityService", () => {
  it("upserts on first authenticate and returns me profile", async () => {
    const tokens: TokenVerifier = {
      verify: async () => ({
        clerkUserId: "clerk_1",
        suggestedNickname: "מישה",
        suggestedAvatarUrl: "https://example.com/a.png",
      }),
    };
    const created = {
      id: "11111111-1111-1111-1111-111111111111",
      nickname: "מישה",
      avatarUrl: "https://example.com/a.png",
      role: "member" as const,
      onboardingCompleted: false,
      suspendedAt: null,
    };
    const users = mockUsers({
      findByClerkId: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(created),
      createWithClerkIdentity: vi.fn().mockResolvedValue(created),
    });
    const service = new IdentityService(users, tokens, new PresenceRegistry(), new Set());
    const actor = await service.authenticate("Bearer stub:clerk_1");
    expect(actor.userId).toBe(created.id);
    const me = await service.getMe(actor);
    expect(me.onboardingCompleted).toBe(false);
    expect(me.nickname).toBe("מישה");
  });

  it("rejects non-admin for admin gate", async () => {
    const service = new IdentityService(
      mockUsers(),
      { verify: async () => ({ clerkUserId: "x" }) },
      new PresenceRegistry(),
      new Set(),
    );
    expect(() =>
      service.requireAdmin({
        userId: "u",
        clerkUserId: "x",
        role: "member",
        suspended: false,
      }),
    ).toThrow(/הרשאה/);
  });

  it("rejects directory access before onboarding is complete", async () => {
    const incomplete = {
      id: "22222222-2222-2222-2222-222222222222",
      nickname: "חדש",
      avatarUrl: null,
      role: "member" as const,
      onboardingCompleted: false,
      suspendedAt: null,
    };
    const users = mockUsers({
      findByClerkId: vi.fn().mockResolvedValue(incomplete),
      listMembers: vi.fn(),
    });
    const service = new IdentityService(
      users,
      { verify: async () => ({ clerkUserId: "clerk_new" }) },
      new PresenceRegistry(),
      new Set(),
    );
    const actor = {
      userId: incomplete.id,
      clerkUserId: "clerk_new",
      role: "member" as const,
      suspended: false,
    };
    await expect(service.listMembers(actor)).rejects.toThrow(/הרשמה/);
    expect(users.listMembers).not.toHaveBeenCalled();
  });

  it("lists members after onboarding is complete", async () => {
    const complete = {
      id: "33333333-3333-3333-3333-333333333333",
      nickname: "ותיק",
      avatarUrl: null,
      role: "member" as const,
      onboardingCompleted: true,
      suspendedAt: null,
    };
    const users = mockUsers({
      findByClerkId: vi.fn().mockResolvedValue(complete),
      listMembers: vi.fn().mockResolvedValue([
        { id: complete.id, nickname: "ותיק", avatarUrl: null },
      ]),
    });
    const service = new IdentityService(
      users,
      { verify: async () => ({ clerkUserId: "clerk_old" }) },
      new PresenceRegistry(),
      new Set(),
    );
    const result = await service.listMembers({
      userId: complete.id,
      clerkUserId: "clerk_old",
      role: "member",
      suspended: false,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.nickname).toBe("ותיק");
    expect(users.listMembers).toHaveBeenCalled();
  });
});
