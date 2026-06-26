import Link from "next/link";
import { Logo } from "@/components/shared/Logo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type AuthCardProps = {
  title: string;
  description: string;
  children: React.ReactNode;
  showTerms?: boolean;
};

export function AuthCard({ title, description, children, showTerms = false }: AuthCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-6 py-12">
      <div className="w-full max-w-[420px]">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="auth-card-shell rounded-lg">
          <Card className="relative z-10 border-[#1f1f1f] bg-[#111111] shadow-2xl">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>{children}</CardContent>
          </Card>
        </div>
        {showTerms && (
          <p className="mt-6 text-center text-xs leading-5 text-muted-foreground">
            By creating an account, you agree to our{" "}
            <Link href="#" className="text-brand hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="#" className="text-brand hover:underline">
              Privacy Policy
            </Link>
            .
          </p>
        )}
      </div>
    </main>
  );
}
