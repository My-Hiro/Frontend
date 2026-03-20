'use client';

import { useState } from "react";
import Link from "next/link";
import { authService } from "@/lib/api/auth.service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package } from "lucide-react";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await authService.forgotPassword(identifier);
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to request password reset");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-xl border-border">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
              <Package size={28} />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Reset Password</CardTitle>
          <CardDescription>
            Enter your email or phone number to receive a reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          {success ? (
            <div className="space-y-6 text-center">
              <div className="p-4 rounded-lg bg-green-500/10 text-green-600 font-medium text-sm">
                If an account exists with those details, we've sent instructions to reset your password.
              </div>
              <Button asChild className="w-full font-bold shadow-lg h-11">
                <Link href="/login">Return to Sign In</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2 text-left">
                <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Email or Phone</label>
                <Input 
                  placeholder="name@example.com" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required 
                />
              </div>
              {error && <p className="text-xs font-bold text-destructive">{error}</p>}
              <Button type="submit" className="w-full h-11 font-bold shadow-lg" disabled={loading}>
                {loading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          )}
          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">Remember your password? </span>
            <Link href="/login" className="text-primary font-bold hover:underline">Sign In</Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
