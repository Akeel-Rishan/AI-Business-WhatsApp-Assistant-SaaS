import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/shared/Logo";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a]">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <nav className="flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost">
              <Link href="/login">Login</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Register</Link>
            </Button>
          </div>
        </nav>
        <div className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <h1 className="max-w-3xl text-5xl font-semibold tracking-normal md:text-6xl">WA Assistant</h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              A production-ready SaaS scaffold for AI-powered WhatsApp customer conversations, leads, and knowledge workflows.
            </p>
            <div className="mt-8 flex gap-3">
              <Button asChild size="lg">
                <Link href="/register">Create workspace</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/dashboard">View dashboard</Link>
              </Button>
            </div>
          </div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-brand" />
                WhatsApp inbox
              </CardTitle>
              <CardDescription>Placeholder landing preview for Phase 1.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border border-border bg-background p-4 text-sm">Customer asks a question on WhatsApp.</div>
              <div className="rounded-md border border-brand/30 bg-brand/10 p-4 text-sm">Assistant drafts the right response.</div>
              <div className="rounded-md border border-border bg-background p-4 text-sm">Lead and customer profile are updated.</div>
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}
