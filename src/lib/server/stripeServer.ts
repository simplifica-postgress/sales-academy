import "server-only";
import Stripe from "stripe";

/**
 * Modo simulado da assinatura: permite testar TODO o fluxo (assinar,
 * cancelar em duas etapas, reativar) sem conta Stripe. Igual ao AI_MOCK.
 * Troque para false no .env quando as chaves reais estiverem configuradas.
 */
export function stripeMock(): boolean {
  return process.env.STRIPE_MOCK === "true";
}

let client: Stripe | null = null;

/** Cliente Stripe real. Lança erro claro se a chave não estiver no ambiente. */
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY ausente no servidor. Configure a chave ou ligue STRIPE_MOCK=true."
    );
  }
  client ??= new Stripe(key);
  return client;
}
