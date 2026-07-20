import type { UploadStatus } from "./types";

/**
 * Faixa de desempenho de uma nota (0–100). As faixas são as MESMAS que a IA
 * usa para calibrar as notas no prompt (85+ excelente, 70–84 bom, 50–69
 * regular, <50 fraco), para a cor na tela contar a mesma história da nota.
 *
 * `icon` existe de propósito: a cor nunca é o único sinal (daltonismo).
 */
export interface ScoreBand {
  key: "excelente" | "bom" | "regular" | "fraco";
  label: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  fill: string;
}

const BANDS: ScoreBand[] = [
  {
    key: "excelente",
    label: "excelente",
    icon: "✓",
    color: "#57c98a",
    bg: "rgba(87,201,138,.1)",
    border: "rgba(87,201,138,.34)",
    fill: "linear-gradient(90deg,#2f9d68,#57c98a)",
  },
  {
    key: "bom",
    label: "bom",
    icon: "✓",
    color: "#7f9bff",
    bg: "rgba(127,155,255,.1)",
    border: "rgba(127,155,255,.32)",
    fill: "linear-gradient(90deg,#4a6edc,#7f9bff)",
  },
  {
    key: "regular",
    label: "regular",
    icon: "!",
    color: "#f5b661",
    bg: "rgba(245,182,97,.1)",
    border: "rgba(245,182,97,.34)",
    fill: "linear-gradient(90deg,#d1913f,#f5b661)",
  },
  {
    key: "fraco",
    label: "fraco",
    icon: "!",
    color: "#f4726a",
    bg: "rgba(244,114,106,.1)",
    border: "rgba(244,114,106,.34)",
    fill: "linear-gradient(90deg,#f4726a,#f59d78)",
  },
];

/** Faixa (cor + ícone + rótulo) correspondente à nota. */
export function scoreBand(v: number): ScoreBand {
  if (v >= 85) return BANDS[0];
  if (v >= 70) return BANDS[1];
  if (v >= 50) return BANDS[2];
  return BANDS[3];
}

/** Cor da nota conforme faixa. */
export function scoreColor(v: number): string {
  return scoreBand(v).color;
}

/** Preenchimento da barra de critério conforme faixa. */
export function criteriaFill(score: number): string {
  return scoreBand(score).fill;
}

export interface StatusPill {
  label: string;
  color: string;
  bg: string;
  border: string;
}

/** Rótulo + cores da pill de status de um upload. */
export function statusPill(status: UploadStatus): StatusPill {
  switch (status) {
    case "processing":
      return {
        label: "processando",
        color: "#5a7cff",
        bg: "rgba(90,124,255,.1)",
        border: "rgba(90,124,255,.35)",
      };
    case "pending":
      return {
        label: "na fila",
        color: "#79839c",
        bg: "#1b2440",
        border: "rgba(120,150,210,.14)",
      };
    case "error":
      return {
        label: "erro",
        color: "#f4726a",
        bg: "rgba(244,114,106,.08)",
        border: "rgba(244,114,106,.3)",
      };
    default:
      return {
        label: "concluído",
        color: "#57c98a",
        bg: "rgba(87,201,138,.1)",
        border: "rgba(87,201,138,.32)",
      };
  }
}

/** Iniciais (até 2 letras) a partir do nome. */
export function initials(name?: string): string {
  if (!name) return "–";
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
