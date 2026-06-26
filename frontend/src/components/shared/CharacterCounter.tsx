import { cn } from "@/lib/utils";

type CharacterCounterProps = {
  current: number;
  max: number;
};

export function CharacterCounter({ current, max }: CharacterCounterProps) {
  const isNearLimit = current / max >= 0.8;

  return (
    <p className={cn("text-xs text-muted-foreground", isNearLimit && "text-red-400")}>
      {current} / {max}
    </p>
  );
}
