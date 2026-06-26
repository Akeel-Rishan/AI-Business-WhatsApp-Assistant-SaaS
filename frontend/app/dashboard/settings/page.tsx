import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">Dashboard</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-normal">Settings</h1>
      <p className="mt-3 text-muted-foreground">Manage business profile and assistant preferences.</p>
      <Button asChild className="mt-5">
        <Link href="/onboarding">Edit business profile</Link>
      </Button>
    </section>
  );
}
