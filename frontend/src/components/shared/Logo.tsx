import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  compact?: boolean;
  className?: string;
};

export function Logo({ compact = false, className }: LogoProps) {
  return (
    <Link href="/" className={cn("flex items-center gap-3", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand text-sm font-bold text-black">
        WA
      </span>
      {!compact && <span className="text-base font-semibold text-white">Assistant</span>}
    </Link>
  );
}
