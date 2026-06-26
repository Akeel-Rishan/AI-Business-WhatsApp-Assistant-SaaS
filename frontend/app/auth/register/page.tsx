import Link from "next/link";
import { registerAction } from "@/app/actions";
import { AuthCard } from "@/components/auth-card";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RegisterPageProps = {
  searchParams: {
    error?: string;
  };
};

export default function RegisterPage({ searchParams }: RegisterPageProps) {
  return (
    <AuthCard
      title="Create account"
      description="Start your business assistant workspace."
      footer={
        <>
          Already registered?{" "}
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form action={registerAction} className="space-y-4">
        <FormMessage error={searchParams.error} />
        <div className="space-y-2">
          <Label htmlFor="businessName">Business name</Label>
          <Input id="businessName" name="businessName" autoComplete="organization" required />
        </div>
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
            autoComplete="new-password"
            minLength={6}
            required
          />
        </div>
        <Button type="submit" className="w-full">
          Sign up
        </Button>
      </form>
    </AuthCard>
  );
}
