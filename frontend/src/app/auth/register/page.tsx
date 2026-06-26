"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
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

type PasswordStrength = "Weak" | "Good" | "Strong";

function getPasswordStrength(password: string): PasswordStrength {
  const hasLength = password.length >= 8;
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z0-9]/.test(password);
  const hasMixedCase = /[a-z]/.test(password) && /[A-Z]/.test(password);

  if (hasLength && hasNumber && hasSymbol && hasMixedCase) return "Strong";
  if (hasLength && ((hasNumber && hasMixedCase) || hasSymbol)) return "Good";
  return "Weak";
}

export default function RegisterPage() {
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!businessName.trim() || !email.trim() || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            business_name: businessName.trim()
          }
        }
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      if (!data.user) {
        setError("Could not create your account. Please try again.");
        return;
      }

      const { error: businessError } = await supabase.from("businesses").insert({
        user_id: data.user.id,
        name: businessName.trim()
      });

      if (businessError) {
        setError(businessError.message);
        return;
      }

      setSuccess(true);
      window.setTimeout(() => router.push("/onboarding"), 250);
    } catch {
      setError("Please check your internet connection.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard title="Create your account" description="Start automating your WhatsApp responses today" showTerms>
      <form className={cn("space-y-4", success && "rounded-md bg-brand/5 p-1 transition-colors")} onSubmit={handleSubmit}>
        <AuthError message={error} />
        <div className="space-y-2">
          <Label htmlFor="businessName">Business Name</Label>
          <Input
            id="businessName"
            value={businessName}
            onChange={(event) => setBusinessName(event.target.value)}
            required
            className={cn("border-[#2a2a2a] bg-[#1a1a1a] focus-visible:ring-brand", error && !businessName.trim() && "border-red-500")}
          />
        </div>
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
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              required
              className={cn("border-[#2a2a2a] bg-[#1a1a1a] pr-10 focus-visible:ring-brand", error && password.length < 8 && "border-red-500")}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-white"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {password && (
            <p
              className={cn(
                "text-xs",
                passwordStrength === "Weak" && "text-red-400",
                passwordStrength === "Good" && "text-yellow-400",
                passwordStrength === "Strong" && "text-brand"
              )}
            >
              {passwordStrength}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={8}
              required
              className={cn("border-[#2a2a2a] bg-[#1a1a1a] pr-10 focus-visible:ring-brand", error && confirmPassword !== password && "border-red-500")}
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-white"
              onClick={() => setShowConfirmPassword((value) => !value)}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <Button type="submit" className="w-full bg-brand text-black hover:bg-brand-dark" disabled={loading}>
          {loading ? <LoadingSpinner size="sm" className="border-black border-t-transparent" /> : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/login" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
