import { Eye, EyeOff, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { discoveryAuthApi, type DiscoveryAuthSession } from "../../state/api";

type AuthMode = "signin" | "signup" | "forgot" | "reset";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;

const normalizePhone = (value: string): string => value.replace(/[\s()-]/g, "");

const isValidIdentifier = (value: string): boolean => {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (EMAIL_PATTERN.test(trimmed)) return true;
  return PHONE_PATTERN.test(normalizePhone(trimmed));
};

type Props = {
  onAuthenticated: (session: DiscoveryAuthSession) => void;
  onLater: () => void;
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

export function AuthGate({ onAuthenticated, onLater }: Props) {
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
  const [useWhatsapp, setUseWhatsapp] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [resetToken, setResetToken] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

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

  const run = async (task: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await task();
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
      throw new Error("Accept terms before creating your account.");
    }

    const session = await discoveryAuthApi.signUp({
      phone: phone || undefined,
      whatsappNumber: useWhatsapp && phone ? phone : undefined,
      email: email || undefined,
      password: signupPassword
    });

    onAuthenticated(session);
  };

  const startForgotPassword = async () => {
    const response = await discoveryAuthApi.forgotPassword(identifier.trim());
    setChallengeId(response.challengeId);
    setMode("reset");
    if (response.challengeId) {
      const devHint = response.devCode ? ` (dev code: ${response.devCode})` : "";
      setStatus(`Reset code sent via ${response.channel ?? "whatsapp"}${devHint}.`);
    } else {
      setStatus("Reset token sent to email in development logs.");
    }
  };

  const completeReset = async () => {
    if (newPassword.length < 8) {
      throw new Error("New password must be at least 8 characters.");
    }
    if (challengeId) {
      await discoveryAuthApi.resetPasswordWithOtp({
        challengeId,
        code: otpCode.trim(),
        newPassword
      });
    } else {
      await discoveryAuthApi.resetPasswordWithToken({
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
    <div className="disc-auth-shell">
      <div className="disc-auth-card">
        <div className="disc-auth-hero-icon">
          <ShoppingBag size={26} />
        </div>
        <h1 className="disc-auth-brand">myHiro</h1>

        {mode === "signin" && (
          <>
            <h2 className="disc-auth-title">Sign in to your account</h2>
            <p className="disc-auth-subtitle">Enter your email or WhatsApp number below</p>
            <div className="disc-auth-form">
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
                <div className="disc-auth-password">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </label>
              <button
                type="button"
                disabled={!canSignIn || busy}
                onClick={() =>
                  run(async () => {
                    const session = await discoveryAuthApi.signInWithPassword({
                      identifier: identifier.trim(),
                      password
                    });
                    onAuthenticated(session);
                  })
                }
              >
                {busy ? "Please wait..." : "Sign In"}
              </button>
            </div>
            <p className="disc-auth-links">
              Forgot password?{" "}
              <button type="button" onClick={() => setMode("forgot")}>
                Reset
              </button>
            </p>
            <p className="disc-auth-links">
              Don&apos;t have an account?{" "}
              <button type="button" onClick={() => setMode("signup")}>
                Sign up
              </button>
            </p>
          </>
        )}

        {mode === "signup" && (
          <>
            <h2 className="disc-auth-title">Create an account</h2>
            <p className="disc-auth-subtitle">
              Join myHiro to find trusted stores and live inventory nearby.
            </p>
            <div className="disc-auth-form disc-auth-grid">
              <label>
                Full Name
                <input value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </label>
              <label>
                Email Address
                <input
                  value={signupEmail}
                  onChange={(event) => setSignupEmail(event.target.value)}
                />
              </label>
              <label>
                Phone Number (WhatsApp)
                <input
                  value={signupPhone}
                  onChange={(event) => setSignupPhone(event.target.value)}
                  placeholder="+233..."
                />
              </label>
              <label className="disc-auth-check disc-auth-full">
                <input
                  type="checkbox"
                  checked={useWhatsapp}
                  onChange={(event) => setUseWhatsapp(event.target.checked)}
                />
                Use WhatsApp for alerts
              </label>
              <label>
                Password
                <div className="disc-auth-password">
                  <input
                    type={showSignupPassword ? "text" : "password"}
                    value={signupPassword}
                    onChange={(event) => setSignupPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword((current) => !current)}
                    aria-label={showSignupPassword ? "Hide password" : "Show password"}
                  >
                    {showSignupPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </label>
              <label>
                Confirm Password
                <div className="disc-auth-password">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((current) => !current)}
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </label>
              <label className="disc-auth-check disc-auth-full">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                />
                I agree to the Terms of Service and Privacy Policy
              </label>
              <button
                type="button"
                className="disc-auth-full"
                disabled={busy}
                onClick={() => run(createAccount)}
              >
                {busy ? "Please wait..." : "Create Account"}
              </button>
            </div>
            <p className="disc-auth-links">
              Already have an account?{" "}
              <button type="button" onClick={() => setMode("signin")}>
                Sign in
              </button>
            </p>
          </>
        )}

        {mode === "forgot" && (
          <>
            <h2 className="disc-auth-title">Forgot your password?</h2>
            <p className="disc-auth-subtitle">Enter your email or WhatsApp number to continue.</p>
            <p className="disc-auth-links">
              <button type="button" onClick={() => setMode("signin")}>
                Back to sign in
              </button>
            </p>
            <div className="disc-auth-form">
              <label>
                Email or Phone
                <input
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="name@example.com or +233..."
                />
              </label>
              <button
                type="button"
                disabled={busy || !identifier.trim()}
                onClick={() => run(startForgotPassword)}
              >
                {busy ? "Sending..." : "Continue"}
              </button>
            </div>
          </>
        )}

        {mode === "reset" && (
          <>
            <h2 className="disc-auth-title">Reset password</h2>
            <p className="disc-auth-subtitle">Enter your code and new password.</p>
            <p className="disc-auth-links">
              <button type="button" onClick={() => setMode("signin")}>
                Back to sign in
              </button>
            </p>
            <div className="disc-auth-form">
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
                  <input
                    value={resetToken}
                    onChange={(event) => setResetToken(event.target.value)}
                  />
                </label>
              )}
              <label>
                New password
                <div className="disc-auth-password">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((current) => !current)}
                    aria-label={showNewPassword ? "Hide password" : "Show password"}
                  >
                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </label>
              <button
                type="button"
                disabled={
                  busy ||
                  newPassword.length < 8 ||
                  (challengeId ? otpCode.length !== 6 : !resetToken.trim())
                }
                onClick={() => run(completeReset)}
              >
                {busy ? "Updating..." : "Reset password"}
              </button>
            </div>
          </>
        )}

        <div className="disc-auth-footer">
          <button
            type="button"
            className="disc-auth-later"
            onClick={() => {
              onLater();
            }}
          >
            Continue later
          </button>
        </div>

        {status && <p className="disc-auth-status">{status}</p>}
        {error && <p className="disc-auth-error">{error}</p>}
      </div>
    </div>
  );
}
