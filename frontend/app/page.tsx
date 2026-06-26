import Link from "next/link";
import { Bot, MessageCircle, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const features: { icon: LucideIcon; title: string; description: string }[] = [
  {
    icon: MessageCircle,
    title: "WhatsApp-first",
    description: "Built around conversations, customers, and message history."
  },
  {
    icon: Users,
    title: "Lead-ready",
    description: "Capture customer intent and follow up from your dashboard."
  },
  {
    icon: ShieldCheck,
    title: "Tenant isolated",
    description: "Supabase RLS keeps each business workspace separated."
  }
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        <nav className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
            <span className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <MessageCircle className="h-5 w-5" />
            </span>
            WA Assistant
          </Link>
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost">
              <Link href="/auth/login">Log in</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/register">Sign up</Link>
            </Button>
          </div>
        </nav>

        <div className="grid flex-1 items-center gap-10 py-16 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="mb-4 inline-flex rounded-md border border-border bg-card px-3 py-1 text-sm text-muted-foreground">
              AI inbox for customer conversations
            </p>
            <h1 className="max-w-3xl text-5xl font-semibold leading-tight tracking-normal md:text-6xl">
              WA Assistant
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted-foreground">
              Manage WhatsApp leads, customer questions, knowledge base answers,
              and business handoff workflows from one clean SaaS dashboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/auth/register">Create your workspace</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/auth/login">Open dashboard</Link>
              </Button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between border-b border-border pb-4">
              <div>
                <p className="text-sm text-muted-foreground">Live assistant</p>
                <h2 className="text-xl font-semibold">Customer intent detected</h2>
              </div>
              <Bot className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-4">
              {[
                ["Customer", "Hi, do you deliver to Colombo today?"],
                ["AI reply", "Yes, same-day delivery is available before 4 PM. Could I confirm your area?"],
                ["Lead", "Delivery inquiry saved as a new lead."]
              ].map(([label, content]) => (
                <div key={label} className="rounded-md border border-border bg-background p-4">
                  <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
                  <p className="mt-2 text-sm leading-6">{content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 pb-8 md:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-lg border border-border bg-card p-5">
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-4 font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
