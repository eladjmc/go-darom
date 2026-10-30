export interface VerifiedClerkToken {
  clerkUserId: string;
  email?: string | null;
  suggestedNickname?: string | null;
  suggestedAvatarUrl?: string | null;
}

export interface TokenVerifier {
  verify(authorizationHeader: string | undefined): Promise<VerifiedClerkToken>;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/** Development-only stub: Authorization: Bearer stub:<clerkUserId> */
export class DevStubTokenVerifier implements TokenVerifier {
  async verify(authorizationHeader: string | undefined): Promise<VerifiedClerkToken> {
    if (!authorizationHeader?.startsWith("Bearer stub:")) {
      throw new AuthError("נדרשת התחברות");
    }
    const clerkUserId = authorizationHeader.slice("Bearer stub:".length).trim();
    if (!clerkUserId) {
      throw new AuthError("אסימון פיתוח לא תקין");
    }
    return {
      clerkUserId,
      suggestedNickname: null,
      suggestedAvatarUrl: null,
    };
  }
}
