export default function InboxPage() {
  return <DashboardSection title="Inbox" description="WhatsApp conversations will appear here." />;
}

function DashboardSection({ title, description }: { title: string; description: string }) {
  return (
    <section className="rounded-lg border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">Dashboard</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-normal">{title}</h1>
      <p className="mt-3 text-muted-foreground">{description}</p>
    </section>
  );
}
