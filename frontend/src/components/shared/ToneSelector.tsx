import { cn } from "@/lib/utils";

export type ToneValue = "friendly" | "professional" | "casual";

const tones: { value: ToneValue; icon: string; label: string; description: string }[] = [
  {
    value: "friendly",
    icon: ":)",
    label: "Friendly",
    description: "Warm, approachable, conversational"
  },
  {
    value: "professional",
    icon: "B",
    label: "Professional",
    description: "Formal, precise, business-focused"
  },
  {
    value: "casual",
    icon: "C",
    label: "Casual",
    description: "Relaxed, informal, like a friend"
  }
];

type ToneSelectorProps = {
  value: ToneValue;
  onChange: (value: ToneValue) => void;
};

export function ToneSelector({ value, onChange }: ToneSelectorProps) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {tones.map((tone) => {
        const isSelected = tone.value === value;
        return (
          <button
            key={tone.value}
            type="button"
            onClick={() => onChange(tone.value)}
            className={cn(
              "rounded-lg border border-[#2a2a2a] bg-[#1a1a1a] p-4 text-left transition-all duration-200 ease-in-out hover:border-brand/70 hover:bg-[#202020]",
              isSelected && "border-brand bg-brand/10"
            )}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm font-bold text-black">
              {tone.icon}
            </span>
            <span className="mt-3 block font-semibold text-white">{tone.label}</span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">{tone.description}</span>
          </button>
        );
      })}
    </div>
  );
}
