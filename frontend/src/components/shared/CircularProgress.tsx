"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface CircularProgressProps {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  label?: string;
  sublabel?: string;
  className?: string;
}

function colorForValue(value: number) {
  if (value <= 40) return "#ef4444";
  if (value <= 70) return "#f59e0b";
  if (value <= 90) return "#3b82f6";
  return "#25D366";
}

export function CircularProgress({
  value,
  size = 160,
  strokeWidth = 12,
  color,
  label,
  sublabel,
  className
}: CircularProgressProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  const normalizedValue = Math.max(0, Math.min(100, Math.round(value)));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedValue / 100) * circumference;
  const progressColor = color ?? colorForValue(normalizedValue);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setAnimatedValue(normalizedValue));
    return () => window.cancelAnimationFrame(frame);
  }, [normalizedValue]);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#2a2a2a"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <div className="flex items-baseline justify-center">
          <span className="text-4xl font-bold text-white">{normalizedValue}</span>
          {label ? <span className="ml-1 text-sm font-semibold text-muted-foreground">{label}</span> : null}
        </div>
        {sublabel ? <div className="mt-1 text-sm font-medium text-muted-foreground">{sublabel}</div> : null}
      </div>
    </div>
  );
}
