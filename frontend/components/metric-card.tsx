import { type LucideIcon } from "lucide-react";

type MetricCardProps = {
  title: string;
  value: string;
  detail: string;
  icon: LucideIcon;
};

export function MetricCard({ title, value, detail, icon: Icon }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{title}</p>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <p className="mt-4 text-3xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}
