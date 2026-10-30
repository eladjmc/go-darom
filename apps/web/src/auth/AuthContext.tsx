import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { MeProfile } from "@go-darom/shared";
import { ApiError, fetchMe } from "./api";

export type AuthMode = "clerk" | "dev-stub" | "unconfigured";

interface AuthContextValue {
  mode: AuthMode;
  token: string | null;
  me: MeProfile | null;
  loading: boolean;
  error: string | null;
  refreshMe: () => Promise<void>;
  setDevStubUser: (clerkUserId: string) => void;
  /** Clears stub session, or ends the Clerk session when wired. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function detectMode(): AuthMode {
  if (import.meta.env.VITE_IDENTITY_DEV_STUB === "true") return "dev-stub";
  if (import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) return "clerk";
  return "unconfigured";
}

export function AuthProvider({
  children,
  clerkToken,
  bootstrapping = false,
  clerkSignOut,
}: {
  children: ReactNode;
  clerkToken: string | null;
  /** True while Clerk session/token is still resolving after sign-in */
  bootstrapping?: boolean;
  /** Clerk `signOut` when identity mode is clerk; omit for stub/unconfigured. */
  clerkSignOut?: () => Promise<void>;
}) {
  const mode = detectMode();
  const [stubToken, setStubToken] = useState<string | null>(() =>
    mode === "dev-stub" ? sessionStorage.getItem("go_darom_dev_stub_token") : null,
  );
  const [me, setMe] = useState<MeProfile | null>(null);
  /** True only until the first /me resolve (or confirmed signed-out). Token refreshes stay silent. */
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasResolvedOnce = useRef(false);

  const token = mode === "clerk" ? clerkToken : stubToken;

  const refreshMe = useCallback(async () => {
    if (bootstrapping) {
      if (!hasResolvedOnce.current) setLoading(true);
      return;
    }
    if (!token) {
      setMe(null);
      setLoading(false);
      hasResolvedOnce.current = true;
      return;
    }
    const showSpinner = !hasResolvedOnce.current;
    if (showSpinner) setLoading(true);
    setError(null);
    try {
      const profile = await fetchMe(token);
      setMe(profile);
    } catch (err) {
      setMe(null);
      setError(err instanceof ApiError ? err.message : "לא ניתן לטעון פרופיל");
    } finally {
      setLoading(false);
      hasResolvedOnce.current = true;
    }
  }, [token, bootstrapping]);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  const setDevStubUser = useCallback(
    (clerkUserId: string) => {
      if (mode !== "dev-stub") return;
      const next = `stub:${clerkUserId}`;
      sessionStorage.setItem("go_darom_dev_stub_token", next);
      setStubToken(next);
    },
    [mode],
  );

  const signOut = useCallback(async () => {
    if (mode === "dev-stub") {
      sessionStorage.removeItem("go_darom_dev_stub_token");
      setStubToken(null);
      setMe(null);
      hasResolvedOnce.current = true;
      setLoading(false);
      return;
    }
    setMe(null);
    if (clerkSignOut) {
      await clerkSignOut();
    }
  }, [mode, clerkSignOut]);

  const value = useMemo(
    () => ({
      mode,
      token,
      me,
      loading,
      error,
      refreshMe,
      setDevStubUser,
      signOut,
    }),
    [mode, token, me, loading, error, refreshMe, setDevStubUser, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth outside AuthProvider");
  return ctx;
}
