import { Eye, EyeOff, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { goLivePromptKeyFor, liveStatusKeyFor } from "../../state/liveStatus";
import type { AuthSession } from "../../state/api";
import { merchantAuthApi } from "../../state/api";
import { onboardingDoneKeyFor, onboardingRequiredKeyFor } from "../onboarding/flow/OnboardingFlow";

type AuthMode = "signin" | "signup" | "forgot" | "reset";

type Props = {
  onAuthenticated: (session: AuthSession) => void;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;

const normalizePhone = (value: string): string => value.replace(/[\s()-]/g, "");

const isValidIdentifier = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (EMAIL_PATTERN.test(trimmed)) return true;
  return PHONE_PATTERN.test(normalizePhone(trimmed));
};

const modePath: Record<AuthMode, string> = {
  signin: "/auth/sign-in",
  signup: "/auth/sign-up",
  forgot: "/auth/forgot-password",
  reset: "/auth/reset-password"
};

const pathMode = (pathname: string): AuthMode => {
  const normalized = pathname.toLowerCase().replace(/\/+$/, "");
  const match = (Object.entries(modePath) as Array<[AuthMode, string]>).find(
    ([, path]) => path === normalized
  );
  return match?.[0] ?? "signin";
};

export function AuthGate({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<AuthMode>(() => {
    if (typeof window === "undefined") return "signin";
    return pathMode(window.location.pathname);
  });

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [fullName, setFullName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [whatsappForAlerts, setWhatsappForAlerts] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const nextPath = modePath[mode];
    if (window.location.pathname !== nextPath) {
      window.history.replaceState(null, "", nextPath);
    }
  }, [mode]);

  const canSignIn = useMemo(
    () => isValidIdentifier(identifier) && password.length >= 8,
    [identifier, password]
  );

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await fn();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const createAccount = async () => {
    const email = signupEmail.trim();
    const phone = signupPhone.trim();

    if (!email && !phone) {
      throw new Error("Provide a valid email or phone number.");
    }

    if (email && !EMAIL_PATTERN.test(email)) {
      throw new Error("Enter a valid email address.");
    }

    if (phone && !PHONE_PATTERN.test(normalizePhone(phone))) {
      throw new Error("Enter a valid phone number.");
    }

    if (signupPassword.length < 8) {
      throw new Error("Password must be at least 8 characters.");
    }

    if (signupPassword !== confirmPassword) {
      throw new Error("Password and confirmation do not match.");
    }

    if (!acceptedTerms) {
      throw new Error("Accept Terms of Service to continue.");
    }

    const session = await merchantAuthApi.signUp({
      phone: phone || undefined,
      whatsappNumber: whatsappForAlerts && phone ? phone : undefined,
      email: email || undefined,
      password: signupPassword
    });

    if (typeof window !== "undefined") {
      localStorage.removeItem(onboardingDoneKeyFor(session.user.id));
      localStorage.setItem(onboardingRequiredKeyFor(session.user.id), "1");
      localStorage.setItem(goLivePromptKeyFor(session.user.id), "1");
      localStorage.setItem(liveStatusKeyFor(session.user.id), "offline");
      localStorage.setItem(
        "merchant_onboarding_signup_prefill",
        JSON.stringify({
          fullName: fullName.trim(),
          storeName: "",
          email,
          phone
        })
      );
    }

    onAuthenticated(session);
  };

  const startForgotPassword = async () => {
    const payload = await merchantAuthApi.forgotPassword(identifier.trim());
    setChallengeId(payload.challengeId);
    setMode("reset");

    if (payload.challengeId) {
      const devHint = payload.devCode ? ` (dev code: ${payload.devCode})` : "";
      setStatus(`Reset code sent via ${payload.channel ?? "whatsapp"}${devHint}.`);
    } else {
      setStatus("Reset token sent to email in development logs.");
    }
  };

  const completePasswordReset = async () => {
    if (newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters.");
    }

    if (challengeId) {
      await merchantAuthApi.resetPasswordWithOtp({
        challengeId,
        code: otpCode.trim(),
        newPassword
      });
    } else {
      await merchantAuthApi.resetPasswordWithToken({
        token: resetToken.trim(),
        newPassword
      });
    }

    setMode("signin");
    setChallengeId(null);
    setOtpCode("");
    setResetToken("");
    setNewPassword("");
    setStatus("Password updated. Sign in with your new password.");
  };

  return (
    <div className="auth-shell">
      <div className="auth-frame auth-frame-single">
        <div className="auth-card auth-card-zip">
          <div className="auth-card-hero">
            <div className="auth-card-hero-icon">
              <ShoppingBag size={28} />
            </div>
          </div>
          <h1 className="auth-title">myHiro merchant</h1>

          {mode === "signin" && (
            <>
              <h2 className="auth-subtitle">Sign in to your account</h2>
              <p>Enter your email or WhatsApp number below</p>
              <div className="auth-form">
                <label>
                  Email or Phone
                  <input
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="name@example.com or +233..."
                  />
                </label>
                <label>
                  Password
                  <div className="auth-password-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                    </button>
                  </div>
                </label>
                <button
                  type="button"
                  onClick={() =>
                    run(async () => {
                      const session = await merchantAuthApi.signInWithPassword({
                        identifier: identifier.trim(),
                        password
                      });
                      onAuthenticated(session);
                    })
                  }
                  disabled={!canSignIn || busy}
                >
                  {busy ? "Please wait..." : "Sign In"}
                </button>
              </div>
              <p className="auth-link-line">
                Forgot password?{" "}
                <button type="button" className="link-btn" onClick={() => setMode("forgot")}>
                  Reset
                </button>
              </p>
              <p className="auth-link-line">
                Don&apos;t have an account?{" "}
                <button type="button" className="link-btn" onClick={() => setMode("signup")}>
                  Sign up
                </button>
              </p>
            </>
          )}

          {mode === "signup" && (
            <>
              <h2 className="auth-subtitle">Create an account</h2>
              <p>Join myHiro merchant and start selling with live inventory.</p>
              <div className="auth-form auth-grid-form">
                <label>
                  Full Name
                  <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
                </label>
                <label>
                  Email Address
                  <input value={signupEmail} onChange={(event) => setSignupEmail(event.target.value)} />
                </label>
                <label>
                  Phone Number (WhatsApp)
                  <input value={signupPhone} onChange={(event) => setSignupPhone(event.target.value)} placeholder="+233..." />
                </label>
                <label className="auth-check full">
                  <input
                    type="checkbox"
                    checked={whatsappForAlerts}
                    onChange={(event) => setWhatsappForAlerts(event.target.checked)}
                  />
                  Use WhatsApp for alerts
                </label>
                <label>
                  Password
                  <div className="auth-password-wrap">
                    <input
                      type={showSignupPassword ? "text" : "password"}
                      value={signupPassword}
                      onChange={(event) => setSignupPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowSignupPassword((current) => !current)}
                      aria-label={showSignupPassword ? "Hide password" : "Show password"}
                    >
                      {showSignupPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                    </button>
                  </div>
                </label>
                <label>
                  Confirm Password
                  <div className="auth-password-wrap">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowConfirmPassword((current) => !current)}
                      aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                    >
                      {showConfirmPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                    </button>
                  </div>
                </label>
                <label className="auth-check full">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(event) => setAcceptedTerms(event.target.checked)}
                  />
                  I agree to the Terms of Service and Privacy Policy
                </label>
                <button
                  type="button"
                  className="full"
                  disabled={busy}
                  onClick={() => run(createAccount)}
                >
                  {busy ? "Please wait..." : "Create Account"}
                </button>
              </div>
              <p className="auth-link-line">
                Already have an account?{" "}
                <button type="button" className="link-btn" onClick={() => setMode("signin")}>
                  Sign in
                </button>
              </p>
            </>
          )}

          {mode === "forgot" && (
            <>
              <h2 className="auth-subtitle">Forgot your password?</h2>
              <p>Enter your email or WhatsApp number to continue.</p>
              <p className="auth-link-line">
                <button type="button" className="link-btn" onClick={() => setMode("signin")}>
                  Back to sign in
                </button>
              </p>
              <div className="auth-form">
                <label>
                  Email or Phone
                  <input
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="name@example.com or +233..."
                  />
                </label>
                <button type="button" disabled={busy || !identifier.trim()} onClick={() => run(startForgotPassword)}>
                  {busy ? "Sending..." : "Continue"}
                </button>
              </div>
            </>
          )}

          {mode === "reset" && (
            <>
              <h2 className="auth-subtitle">Reset password</h2>
              <p>Enter your code and set a new password.</p>
              <p className="auth-link-line">
                <button type="button" className="link-btn" onClick={() => setMode("signin")}>
                  Back to sign in
                </button>
              </p>
              <div className="auth-form">
                {challengeId ? (
                  <label>
                    OTP code
                    <input
                      value={otpCode}
                      onChange={(event) => setOtpCode(event.target.value)}
                      maxLength={6}
                    />
                  </label>
                ) : (
                  <label>
                    Email reset token
                    <input value={resetToken} onChange={(event) => setResetToken(event.target.value)} />
                  </label>
                )}
                <label>
                  New password
                  <div className="auth-password-wrap">
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowNewPassword((current) => !current)}
                      aria-label={showNewPassword ? "Hide password" : "Show password"}
                    >
                      {showNewPassword ? <EyeOff size={22} /> : <Eye size={22} />}
                    </button>
                  </div>
                </label>
                <button
                  type="button"
                  disabled={busy || (challengeId ? otpCode.length !== 6 : !resetToken.trim())}
                  onClick={() => run(completePasswordReset)}
                >
                  {busy ? "Updating..." : "Reset Password"}
                </button>
              </div>
            </>
          )}

          {status && <p className="auth-status">{status}</p>}
          {error && <p className="auth-error">{error}</p>}
        </div>
      </div>
    </div>
  );
}
