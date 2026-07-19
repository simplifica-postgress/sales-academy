import type { Timestamp } from "firebase/firestore";

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
