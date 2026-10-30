import { createClerkClient, verifyToken } from "@clerk/backend";
import { AuthError, type TokenVerifier, type VerifiedClerkToken } from "./token-verifier.js";

export class ClerkTokenVerifier implements TokenVerifier {
  private readonly clerk;

  constructor(private readonly secretKey: string) {
    this.clerk = createClerkClient({ secretKey });
  }

  async verify(authorizationHeader: string | undefined): Promise<VerifiedClerkToken> {
    if (!authorizationHeader?.startsWith("Bearer ")) {
      throw new AuthError("נדרשת התחברות");
    }
    const token = authorizationHeader.slice("Bearer ".length).trim();
    if (!token) {
      throw new AuthError("נדרשת התחברות");
    }

    try {
      const payload = await verifyToken(token, { secretKey: this.secretKey });
      const clerkUserId = payload.sub;
      if (!clerkUserId) {
        throw new AuthError("אסימון לא תקין");
      }

      let suggestedNickname: string | null = null;
      let suggestedAvatarUrl: string | null = null;
      let email: string | null = null;
      try {
        const user = await this.clerk.users.getUser(clerkUserId);
        const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
        suggestedNickname = user.username ?? (fullName || null);
        suggestedAvatarUrl = user.imageUrl ?? null;
        email = user.emailAddresses[0]?.emailAddress ?? null;
      } catch {
        // Profile enrichment is best-effort; identity mapping still proceeds.
      }

      return { clerkUserId, email, suggestedNickname, suggestedAvatarUrl };
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError("אסימון לא תקין או שפג תוקפו");
    }
  }
}
