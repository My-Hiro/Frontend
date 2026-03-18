import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { adminAuthApi, type AdminAuthSession } from "../../state/api";

type Mode = "signin" | "forgot" | "reset";

type Props = {
  onAuthenticated: (session: AdminAuthSession) => void;
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

const modePath: Record<Mode, string> = {
  signin: "/auth/sign-in",
  forgot: "/auth/forgot-password",
  reset: "/auth/reset-password"
};

const pathMode = (pathname: string): Mode => {
  const normalized = pathname.toLowerCase().replace(/\/+$/, "");
  const match = (Object.entries(modePath) as Array<[Mode, string]>).find(
    ([, path]) => path === normalized
  );
  return match?.[0] ?? "signin";
};

export function AuthGate({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return "signin";
    return pathMode(window.location.pathname);
  });

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [token, setToken] = useState("");
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

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setStatus("");
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Request failed.");
    } finally {
      setBusy(false);
    }
  };

  const assertAdmin = (session: AdminAuthSession) => {
    if (session.user.role !== "admin") {
      throw new Error("This account is not authorized for Admin access.");
    }
    onAuthenticated(session);
  };

  return (
    <div className="auth-shell">
      <div className="auth-frame auth-frame-single">
        <div className="auth-card auth-card-zip">
          <div className="auth-card-hero">
            <div className="auth-card-hero-icon">
              <ShieldCheck size={24} />
            </div>
          </div>
          <h1 className="auth-title">myHiro Admin</h1>

          {mode === "signin" && (
            <>
              <h2 className="auth-subtitle">Sign in to your account</h2>
              <p>Use your password to access platform controls.</p>

              <div className="auth-form">
                <label>
                  Phone or email
                  <input
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="+233... or admin@example.com"
                  />
                </label>
                <label>
                  Password
                  <div className="auth-password-wrap">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      className="auth-password-toggle"
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </label>
                <button
                  type="button"
                  disabled={busy || !canSignIn}
                  onClick={() =>
                    run(async () => {
                      const session = await adminAuthApi.signInWithPassword({
                        identifier: identifier.trim(),
                        password
                      });
                      assertAdmin(session);
                    })
                  }
                >
                  {busy ? "Please wait..." : "Sign in"}
                </button>
              </div>
              <p className="auth-link-line">
                Forgot password?{" "}
                <button type="button" className="link-btn" onClick={() => setMode("forgot")}>
                  Reset
                </button>
              </p>
            </>
          )}

          {mode === "forgot" && (
            <>
              <h2 className="auth-subtitle">Forgot your password?</h2>
              <p>Enter your phone or email to request a reset code.</p>
              <p className="auth-link-line">
                <button type="button" className="link-btn" onClick={() => setMode("signin")}>
                  Back to sign in
                </button>
              </p>
              <div className="auth-form">
                <label>
                  Phone or email
                  <input
                    value={identifier}
                    onChange={(event) => setIdentifier(event.target.value)}
                    placeholder="+233... or admin@example.com"
                  />
                </label>
                <button
                  type="button"
                  disabled={busy || !identifier.trim()}
                  onClick={() =>
                    run(async () => {
                      const payload = await adminAuthApi.forgotPassword(identifier.trim());
                      setChallengeId(payload.challengeId);
                      setMode("reset");
                      if (payload.challengeId) {
                        const devHint = payload.devCode ? ` (dev code: ${payload.devCode})` : "";
                        setStatus(`Reset code sent via ${payload.channel ?? "sms"}${devHint}.`);
                      } else {
                        setStatus("Check mail log for reset token.");
                      }
                    })
                  }
                >
                  {busy ? "Sending..." : "Continue"}
                </button>
              </div>
            </>
          )}

          {mode === "reset" && (
            <>
              <h2 className="auth-subtitle">Reset password</h2>
              <p>Enter your reset code and new password.</p>
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
                      value={code}
                      onChange={(event) => setCode(event.target.value)}
                      maxLength={6}
                    />
                  </label>
                ) : (
                  <label>
                    Email reset token
                    <input value={token} onChange={(event) => setToken(event.target.value)} />
                  </label>
                )}
                <label>
                  New password
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                  />
                </label>
                <button
                  type="button"
                  disabled={busy || newPassword.length < 8 || (challengeId ? code.length !== 6 : !token.trim())}
                  onClick={() =>
                    run(async () => {
                      if (challengeId) {
                        await adminAuthApi.resetPasswordWithOtp({
                          challengeId,
                          code: code.trim(),
                          newPassword
                        });
                      } else {
                        await adminAuthApi.resetPasswordWithToken({
                          token: token.trim(),
                          newPassword
                        });
                      }
                      setMode("signin");
                      setChallengeId(null);
                      setCode("");
                      setToken("");
                      setNewPassword("");
                      setStatus("Password updated. Sign in again.");
                    })
                  }
                >
                  {busy ? "Updating..." : "Reset password"}
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
