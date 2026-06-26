import Link from "next/link";
import { loginAction } from "@/app/actions";
import { AuthCard } from "@/components/auth-card";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type LoginPageProps = {
  searchParams: {
    error?: string;
    message?: string;
  };
};

export default function LoginPage({ searchParams }: LoginPageProps) {
  return (
    <AuthCard
      title="Log in"
      description="Access your WhatsApp assistant workspace."
      footer={
        <>
          New to WA Assistant?{" "}
          <Link href="/auth/register" className="font-medium text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form action={loginAction} className="space-y-4">
        <FormMessage error={searchParams.error} message={searchParams.message} />
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            minLength={6}
            required
          />
        </div>
        <Button type="submit" className="w-full">
          Log in
        </Button>
      </form>
    </AuthCard>
  );
}
