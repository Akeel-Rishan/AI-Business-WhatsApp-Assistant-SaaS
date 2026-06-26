import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Logo } from "@/components/shared/Logo";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        <Logo className="mb-8 justify-center" />
        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
            <CardDescription>Access your WA Assistant workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@business.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" />
              </div>
              <Button type="button" className="w-full">Login</Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              New here? <Link href="/register" className="text-brand hover:underline">Create an account</Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
