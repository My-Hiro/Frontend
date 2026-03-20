"use client";

import { Eye, EyeOff, ShieldCheck, Lock, Mail, Loader2, ArrowRight } from "lucide-react";
import { useState } from "react";
import { adminAuthApi } from "../../lib/api/auth";
import type { AdminAuthSession } from "../../lib/api/session";
import { cn } from "../../lib/utils";

type Mode = "signin" | "forgot";

interface AuthGateProps {
  onAuthenticated: (session: AdminAuthSession) => void;
}

export function AuthGate({ onAuthenticated }: AuthGateProps) {
  const [mode, setMode] = useState<Mode>("signin");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const session = await adminAuthApi.signInWithPassword({ identifier, password });
      onAuthenticated(session);
    } catch (err: any) {
      setError(err.message || "Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-[400px] space-y-8">
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 mb-2">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">myHiro Admin</h1>
          <p className="text-sm text-muted-foreground">Secure oversight & platform management</p>
        </div>

        <div className="bg-card border rounded-2xl shadow-xl p-8 space-y-6">
          {mode === "signin" ? (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Identity</label>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Mail size={16} />
                  </div>
                  <input 
                    type="text"
                    placeholder="Email or phone number"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                    className="w-full pl-10 pr-4 py-2.5 bg-background border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Password</label>
                  <button 
                    type="button" 
                    onClick={() => setMode("forgot")}
                    className="text-xs font-bold text-primary hover:underline transition-all"
                  >
                    Forgot?
                  </button>
                </div>
                <div className="relative group">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                    <Lock size={16} />
                  </div>
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full pl-10 pr-10 py-2.5 bg-background border rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-xs font-bold text-destructive flex items-center gap-2">
                  <div className="h-4 w-4 rounded-full bg-destructive flex items-center justify-center shrink-0">
                    <span className="text-[10px] text-white">!</span>
                  </div>
                  {error}
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading}
                className="w-full py-3 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-bold text-sm shadow-lg shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : (
                  <>
                    Sign In <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className="space-y-6 py-2">
              <div className="space-y-2">
                <h2 className="text-lg font-bold">Reset Password</h2>
                <p className="text-xs text-muted-foreground leading-relaxed">Enter your registered identifier. We will send recovery instructions to your email or phone.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Identity</label>
                <input 
                  type="text"
                  placeholder="Email or phone"
                  className="w-full px-4 py-2.5 bg-background border rounded-xl text-sm font-medium outline-none"
                />
              </div>
              <div className="flex flex-col gap-3">
                <button className="w-full py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm">
                  Send Recovery Link
                </button>
                <button 
                  onClick={() => setMode("signin")}
                  className="w-full py-2 text-sm font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  Return to Sign In
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground font-medium">
          Protected by myHiro Cloud Guard &bull; &copy; 2026
        </p>
      </div>
    </div>
  );
}
