import { BookOpen, Inbox, Target, Users } from "lucide-react";
import { MetricCard } from "@/components/metric-card";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: business } = user
    ? await supabase.from("businesses").select("name").eq("user_id", user.id).maybeSingle()
    : { data: null };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted-foreground">Dashboard</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-normal">
          {business?.name ?? "Your business"} workspace
        </h1>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Inbox" value="0" detail="Open conversations" icon={Inbox} />
        <MetricCard title="Customers" value="0" detail="Synced contacts" icon={Users} />
        <MetricCard title="Knowledge" value="0" detail="Active answers" icon={BookOpen} />
        <MetricCard title="Leads" value="0" detail="New opportunities" icon={Target} />
      </div>
      <section className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-xl font-semibold">Workspace ready</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
          Connect WhatsApp credentials, add FAQs, and route leads from the sidebar as the
          product grows. Your authentication, tenant profile, and database policies are ready.
        </p>
      </section>
    </div>
  );
}
