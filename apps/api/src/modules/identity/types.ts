import type { MeProfile, UserRole } from "@go-darom/shared";

export interface AuthenticatedActor {
  userId: string;
  clerkUserId: string;
  role: UserRole;
  suspended: boolean;
}

export interface UpsertIdentityInput {
  clerkUserId: string;
  email?: string | null;
  suggestedNickname?: string | null;
  suggestedAvatarUrl?: string | null;
}

export type { MeProfile, UserRole };
