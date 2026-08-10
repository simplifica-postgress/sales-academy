import type { Timestamp } from "firebase/firestore";
import type { PlanId, SubscriptionStatus, UserProfile } from "./types";

/** Preço exibido do plano individual (a cobrança real vive no Stripe). */
export const VENDEDOR_PRICE_LABEL = "R$ 147/mês";

export const PLAN_LABELS: Record<PlanId, string> = {
  vendedor: "Plano Vendedor",
  enterprise: "Plano Enterprise",
};

export const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  active: "Ativa",
  past_due: "Pagamento pendente",
  canceling: "Cancelada — acesso até o fim do período",
  canceled: "Encerrada",
};

/** Cor semântica do status (tokens do tema). */
export function statusTone(status: SubscriptionStatus): "good" | "warn" | "bad" {
  if (status === "active") return "good";
  if (status === "past_due") return "warn";
  return "bad";
}

/** Só um lugar decide quem entra — telas e servidor usam esta mesma lista. */
export type AccessReason =
  | "master"
  | "gestor"
  | "empresarial"
  | "cortesia"
  | "assinatura"
  | "periodo-final"
  | "sem-acesso";

/** Campos necessários para julgar acesso (serve ao cliente e ao servidor). */
export type AccessInput = Pick<
  UserProfile,
  "role" | "plan" | "subscriptionStatus" | "subscriptionPeriodEnd" | "courtesyAccess"
> & { subscriptionPeriodEnd?: { toMillis(): number } | null };

/**
 * POR QUE esta pessoa tem (ou não tem) acesso.
 *
 * Regras, em ordem:
 *  · master e gestor entram sempre — quem administra não paga assinatura, e
 *    a empresa do gestor é contratada por fora;
 *  · plano empresarial entra (contrato direto, sem passar pelo checkout);
 *  · cortesia entra (quem já usava antes de existir cobrança);
 *  · assinatura ativa entra; `past_due` também, porque cortar no primeiro
 *    cartão recusado perde cliente que só trocou de cartão;
 *  · cancelada entra até o fim do período já pago.
 */
export function accessReason(profile: AccessInput | null): AccessReason {
  if (!profile) return "sem-acesso";
  if (profile.role === "master") return "master";
  if (profile.role === "manager") return "gestor";
  if (profile.plan === "enterprise") return "empresarial";
  if (profile.courtesyAccess === true) return "cortesia";
  const s = profile.subscriptionStatus;
  if (s === "active" || s === "past_due") return "assinatura";
  if (s === "canceling") {
    const end = profile.subscriptionPeriodEnd;
    if (end && end.toMillis() > Date.now()) return "periodo-final";
  }
  return "sem-acesso";
}

/** Pode usar a plataforma agora? */
export function hasAccess(profile: AccessInput | null): boolean {
  return accessReason(profile) !== "sem-acesso";
}

/**
 * O bloqueio está ligado? Fica atrás de um interruptor para poder subir o
 * código sem mudar nada para ninguém, e ligar só quando você decidir.
 * Ausente ou diferente de "true" = desligado (ninguém é barrado).
 */
export function paywallLigado(): boolean {
  return process.env.NEXT_PUBLIC_PAYWALL === "true";
}

/** Data curta em pt-BR (ex.: 15 de setembro de 2026). */
export function formatPeriodEnd(end: Timestamp | null | undefined): string {
  if (!end) return "—";
  return end.toDate().toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "America/Sao_Paulo",
  });
}
