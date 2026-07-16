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

/** Fuso de referência do produto (evita divergência de "dia" entre client e backend). */
export const APP_TIMEZONE = "America/Sao_Paulo";

/** Chave do dia (YYYY-MM-DD) no fuso do produto. */
export function dayKeyBR(d: Date): string {
  // "en-CA" formata como YYYY-MM-DD.
  return d.toLocaleDateString("en-CA", { timeZone: APP_TIMEZONE });
}

/** True se o timestamp cai no dia de hoje (fuso do produto). */
export function isToday(ts: Timestamp | null | undefined): boolean {
  if (!ts) return false;
  return dayKeyBR(ts.toDate()) === dayKeyBR(new Date());
}
