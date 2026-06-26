import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type StepCardProps = {
  stepNumber: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
};

export function StepCard({ stepNumber, title, subtitle, children }: StepCardProps) {
  return (
    <Card className="border-[#1f1f1f] bg-[#111111] shadow-2xl">
      <CardHeader>
        <p className="text-sm font-medium text-brand">Step {stepNumber} of 4</p>
        <CardTitle className="text-2xl">{title}</CardTitle>
        <CardDescription>{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
