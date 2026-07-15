import type { UploadStatus } from "./types";

/** Cor da nota conforme faixa (padrão do design). */
export function scoreColor(v: number): string {
  if (v >= 85) return "#00e3ff"; // cyan-light
  if (v >= 70) return "#f5f9fb"; // foreground
  return "#6d8698"; // muted
}

/** Preenchimento da barra de critério conforme faixa. */
export function criteriaFill(score: number): string {
  if (score >= 85) return "linear-gradient(90deg,#0087f8,#00e3ff)";
  if (score >= 70) return "linear-gradient(90deg,#0052b9,#0087f8)";
  return "#0052b9";
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
        color: "#6d8698",
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
        color: "#00cbff",
        bg: "rgba(0,203,255,.07)",
        border: "rgba(0,203,255,.25)",
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
