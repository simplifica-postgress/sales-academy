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
    color: "#25d97d",
    bg: "rgba(37,217,125,.1)",
    border: "rgba(37,217,125,.34)",
    fill: "linear-gradient(90deg,#12a86a,#25d97d)",
  },
  {
    key: "bom",
    label: "bom",
    icon: "✓",
    color: "#00cbff",
    bg: "rgba(0,203,255,.1)",
    border: "rgba(0,203,255,.32)",
    fill: "linear-gradient(90deg,#0052b9,#00cbff)",
  },
  {
    key: "regular",
    label: "regular",
    icon: "!",
    color: "#ffb020",
    bg: "rgba(255,176,32,.1)",
    border: "rgba(255,176,32,.34)",
    fill: "linear-gradient(90deg,#c77b00,#ffb020)",
  },
  {
    key: "fraco",
    label: "fraco",
    icon: "!",
    color: "#ff8d85",
    bg: "rgba(255,90,80,.1)",
    border: "rgba(255,90,80,.34)",
    fill: "linear-gradient(90deg,#c0392f,#ff8d85)",
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
        color: "#0087f8",
        bg: "rgba(0,135,248,.1)",
        border: "rgba(0,135,248,.35)",
      };
    case "pending":
      return {
        label: "na fila",
        color: "#9db2c3",
        bg: "#152946",
        border: "rgba(0,45,115,.5)",
      };
    case "error":
      return {
        label: "erro",
        color: "#ff8d85",
        bg: "rgba(255,90,80,.08)",
        border: "rgba(255,90,80,.3)",
      };
    default:
      return {
        label: "concluído",
        color: "#25d97d",
        bg: "rgba(37,217,125,.1)",
        border: "rgba(37,217,125,.32)",
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
