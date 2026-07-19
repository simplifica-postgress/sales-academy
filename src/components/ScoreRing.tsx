"use client";

import { useId } from "react";
import { scoreBand } from "@/lib/ui";

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
  // O anel assume a cor da faixa da nota: verde (excelente), ciano (bom),
  // âmbar (regular), vermelho (fraco).
  const band = scoreBand(value ?? 0);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={band.color} stopOpacity="0.55" />
            <stop offset="100%" stopColor={band.color} />
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
        <span
          className="font-mono font-semibold text-foreground"
          style={{ fontSize: Math.round(size * 0.26), letterSpacing: "-0.02em" }}
        >
          {value === null ? "–" : Math.round(value)}
        </span>
        {sublabel ? (
          <span
            className="font-mono font-semibold uppercase text-muted"
            style={{ fontSize: Math.max(9, size * 0.065), letterSpacing: "0.18em" }}
          >
            {sublabel}
          </span>
        ) : null}
      </div>
    </div>
  );
}
