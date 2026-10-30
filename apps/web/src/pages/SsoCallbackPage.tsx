import { HandleSSOCallback } from "@clerk/react";
import { useNavigate } from "react-router-dom";
import "./auth.css";

/**
 * Completes Clerk OAuth redirect after Google. Required for custom SSO flows.
 * Lands on /onboarding; returning users are sent home by OnboardingPage.
 */
export function SsoCallbackPage() {
  const navigate = useNavigate();

  const go = (path: string) => {
    if (path.startsWith("http")) {
      window.location.href = path;
      return;
    }
    navigate(path, { replace: true });
  };

  return (
    <div className="auth-page">
      <p className="auth-status">משלימים התחברות…</p>
      <HandleSSOCallback
        navigateToApp={({ decorateUrl }) => {
          go(decorateUrl("/onboarding"));
        }}
        navigateToSignIn={() => go("/sign-in")}
        navigateToSignUp={() => go("/sign-in")}
      />
    </div>
  );
}
