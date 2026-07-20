"use client";

import { useId } from "react";
import { scoreColor } from "@/lib/ui";

interface Point {
  score: number;
  label: string;
}

/** Gráfico de linha simples da evolução das notas (0–100). */
export default function EvolutionChart({ points }: { points: Point[] }) {
  const gradientId = useId();
  const width = 640;
  const height = 200;
  const padX = 32;
  const padY = 20;

  if (points.length === 1) {
    return (
      <p className="py-4 text-sm text-muted">
        Nota atual: <span className="font-bold text-white">{points[0].score}</span>.
        A evolução aparece a partir do segundo envio.
      </p>
    );
  }

  const maxX = points.length - 1;
  const xFor = (i: number) => padX + (i / maxX) * (width - padX * 2);
  const yFor = (score: number) =>
    height - padY - (score / 100) * (height - padY * 2);

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i)} ${yFor(p.score)}`)
    .join(" ");
  const areaPath =
    `M ${xFor(0)} ${height - padY} ` +
    points.map((p, i) => `L ${xFor(i)} ${yFor(p.score)}`).join(" ") +
    ` L ${xFor(maxX)} ${height - padY} Z`;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-auto w-full min-w-[420px]"
        role="img"
        aria-label="Gráfico de evolução das notas"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Referências: 85 = meta (verde), 50 = piso de atenção (âmbar) */}
        {[
          { ref: 85, stroke: "rgba(87,201,138,.5)" },
          { ref: 50, stroke: "rgba(245,182,97,.35)" },
        ].map(({ ref, stroke }) => (
          <line
            key={ref}
            x1={padX}
            x2={width - padX}
            y1={yFor(ref)}
            y2={yFor(ref)}
            stroke={stroke}
            strokeDasharray="4 4"
          />
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke="var(--cyan)"
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => {
          // Cada ponto assume a cor da sua faixa: dá pra ver num relance
          // quais atendimentos foram bons e quais foram fracos.
          const c = scoreColor(p.score);
          return (
            <g key={i}>
              <circle cx={xFor(i)} cy={yFor(p.score)} r={4.5} fill={c} />
              <text
                x={xFor(i)}
                y={yFor(p.score) - 10}
                textAnchor="middle"
                className="text-[11px] font-semibold"
                fill={c}
              >
                {Math.round(p.score)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
