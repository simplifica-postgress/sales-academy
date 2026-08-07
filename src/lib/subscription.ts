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

/**
 * Tem acesso pago AGORA? `canceling` mantém acesso até o fim do período;
 * `past_due` mantém enquanto o Stripe tenta cobrar de novo (padrão do
 * mercado: não corta no primeiro cartão recusado).
 */
export function hasPaidAccess(
  profile: Pick<UserProfile, "subscriptionStatus" | "subscriptionPeriodEnd" | "plan"> | null
): boolean {
  if (!profile) return false;
  if (profile.plan === "enterprise") return true;
  const s = profile.subscriptionStatus;
  if (s === "active" || s === "past_due") return true;
  if (s === "canceling") {
    const end = profile.subscriptionPeriodEnd as Timestamp | null | undefined;
    return !!end && end.toMillis() > Date.now();
  }
  return false;
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
