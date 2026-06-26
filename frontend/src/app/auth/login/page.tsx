"use client";

import Link from "next/link";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/shared/AuthCard";
import { AuthError } from "@/components/shared/AuthError";
import { LoadingSpinner } from "@/components/shared/LoadingSpinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setToast("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (signInError || !data.user) {
        const message = signInError?.message?.toLowerCase() ?? "";
        if (message.includes("email not confirmed") || message.includes("not confirmed")) {
          setError("Please confirm your email address before signing in.");
        } else if (message.includes("invalid login credentials") || message.includes("invalid")) {
          setError("Invalid email or password");
        } else {
          setError(signInError?.message ?? "Unable to sign in. Please try again.");
        }
        return;
      }

      const { data: business, error: businessError } = await supabase
        .from("businesses")
        .select("onboarding_completed")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (businessError) {
        setError(businessError.message);
        return;
      }

      setSuccess(true);
      window.setTimeout(() => {
        router.push(business?.onboarding_completed ? "/dashboard" : "/onboarding");
      }, 200);
    } catch {
      setError("Please check your internet connection");
    } finally {
      setLoading(false);
    }
  }

  function showComingSoon() {
    setToast("Coming soon");
    window.setTimeout(() => setToast(""), 1800);
  }

  return (
    <AuthCard title="Welcome back" description="Sign in to your WA Assistant dashboard">
      <form className={cn("space-y-4", success && "rounded-md bg-brand/5 p-1 transition-colors")} onSubmit={handleSubmit}>
        <AuthError message={error} />
        {toast && <div className="rounded-md border border-brand/40 bg-brand/10 px-3 py-2 text-sm text-brand">{toast}</div>}
        <div className="space-y-2">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className={cn("border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand", error && !email.trim() && "border-red-500")}
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password">Password</Label>
            <button type="button" className="text-xs text-brand hover:underline" onClick={showComingSoon}>
              Forgot password?
            </button>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className={cn("border-[#2a2a2a] bg-[#1a1a1a] pr-10 focus-visible:ring-brand", error && !password && "border-red-500")}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-white"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full bg-brand text-black hover:bg-brand-dark" disabled={loading}>
          {loading ? <LoadingSpinner size="sm" className="border-black border-t-transparent" /> : "Sign in"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/auth/register" className="font-medium text-brand hover:underline">
          Sign up
        </Link>
      </p>
    </AuthCard>
  );
}
