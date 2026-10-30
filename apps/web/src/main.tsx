import { ClerkProvider, useAuth as useClerkAuth } from "@clerk/react";
import { StrictMode, useEffect, useRef, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
import { AuthProvider } from "./auth/AuthContext";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { DevGobanPoc } from "./dev/DevGobanPoc";
import "./styles/global.css";
import "./pages/auth.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Root element #root not found");
}

const path = window.location.pathname.replace(/\/+$/, "") || "/";
const isDevGobanPoc = import.meta.env.DEV && path === "/dev/goban-poc";

function useClerkSessionToken(
  getToken: (options?: { skipCache?: boolean }) => Promise<string | null>,
  isLoaded: boolean,
  isSignedIn: boolean | undefined,
): { token: string | null; tokenReady: boolean } {
  const [token, setToken] = useState<string | null>(null);
  const [tokenReady, setTokenReady] = useState(false);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  useEffect(() => {
    if (!isLoaded) {
      setTokenReady(false);
      return;
    }

    let cancelled = false;

    if (!isSignedIn) {
      setToken(null);
      setTokenReady(true);
      return;
    }

    const refresh = (forceReadyGate: boolean) => {
      if (forceReadyGate) setTokenReady(false);
      void getTokenRef
        .current({ skipCache: true })
        .then((t) => {
          if (cancelled) return;
          // Avoid pointless state churn when Clerk returns the same JWT string.
          setToken((prev) => (prev === t ? prev : t));
          setTokenReady(true);
        })
        .catch(() => {
          if (cancelled) return;
          setToken(null);
          setTokenReady(true);
        });
    };
    refresh(true);
    const id = window.setInterval(() => refresh(false), 50000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [isLoaded, isSignedIn]);

  return { token, tokenReady };
}

function ClerkTokenBridge({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn, signOut } = useClerkAuth();
  const { token, tokenReady } = useClerkSessionToken(getToken, isLoaded, isSignedIn);
  const bootstrapping = !isLoaded || (Boolean(isSignedIn) && !tokenReady);

  return (
    <AuthProvider
      clerkToken={token}
      bootstrapping={bootstrapping}
      clerkSignOut={() => signOut({ redirectUrl: "/" })}
    >
      {children}
    </AuthProvider>
  );
}

function Root() {
  const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
  const useClerk = Boolean(publishableKey) && import.meta.env.VITE_IDENTITY_DEV_STUB !== "true";

  return (
    <BrowserRouter>
      <ErrorBoundary>
        {useClerk ? (
          <ClerkProvider publishableKey={publishableKey!} afterSignOutUrl="/">
            <ClerkTokenBridge>
              <App />
            </ClerkTokenBridge>
          </ClerkProvider>
        ) : (
          <AuthProvider clerkToken={null}>
            <App />
          </AuthProvider>
        )}
      </ErrorBoundary>
    </BrowserRouter>
  );
}

createRoot(root).render(
  <StrictMode>
    {isDevGobanPoc ? <DevGobanPoc /> : <Root />}
  </StrictMode>,
);
