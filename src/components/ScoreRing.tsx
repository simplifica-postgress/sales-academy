"use client";

import { useId } from "react";

/** Indicador circular de nota (0–100), estilo donut do dashboard. */
export default function ScoreRing({
  value,
  size = 120,
  strokeWidth = 10,
  sublabel,
}: {
  value: number | null;
  size?: number;
  strokeWidth?: number;
  sublabel?: string;
}) {
  const gradientId = useId();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.max(0, Math.min(100, value ?? 0));
  const dash = (pct / 100) * circumference;

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--cyan-light)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--indicator)"
          strokeWidth={strokeWidth}
        />
        {pct > 0 ? (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            className="transition-all duration-700"
          />
        ) : null}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">
          {value === null ? "–" : Math.round(value)}
        </span>
        {sublabel ? (
          <span className="text-[10px] uppercase tracking-wider text-muted">
            {sublabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
