import type { Timestamp } from "firebase/firestore";
import { TRAINING_TOTAL_DAYS } from "./constants";

/**
 * Dia atual do treinamento (1–30), calculado a partir da data de início.
 * Retorna 0 se o treinamento ainda não começou.
 */
export function computeTrainingDay(start: Timestamp | null): number {
  if (!start) return 0;
  const elapsedMs = Date.now() - start.toDate().getTime();
  const day = Math.floor(elapsedMs / 86_400_000) + 1;
  return Math.min(Math.max(day, 1), TRAINING_TOTAL_DAYS);
}

/** Formata data para exibição curta (ex.: 14/07). */
export function shortDate(ts: Timestamp | null | undefined): string {
  if (!ts) return "—";
  return ts.toDate().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

/** True se o timestamp cai no dia de hoje (fuso local). */
export function isToday(ts: Timestamp | null | undefined): boolean {
  if (!ts) return false;
  const d = ts.toDate();
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
}
