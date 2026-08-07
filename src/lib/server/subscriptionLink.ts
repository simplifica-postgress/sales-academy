import "server-only";
import { FieldValue, Timestamp, type DocumentReference } from "firebase-admin/firestore";
import { adminDb } from "./firebaseAdmin";

/** Dados de assinatura que o webhook grava no usuário. */
export interface SubscriptionData {
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  periodEnd: Timestamp | null;
}

/** E-mail como chave de documento: minúsculo e sem espaços. */
export function emailKey(email: string): string {
  return email.trim().toLowerCase();
}

/** Ativa o plano Vendedor no usuário. */
export async function activateSubscription(
  userRef: DocumentReference,
  data: SubscriptionData
): Promise<void> {
  await userRef.update({
    plan: "vendedor",
    subscriptionStatus: "active",
    stripeCustomerId: data.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId,
    subscriptionPeriodEnd: data.periodEnd,
    subscriptionUpdatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Guarda um pagamento que ainda não tem dono: quem comprou pela landing page
 * paga ANTES de criar a conta. Fica esperando pelo e-mail usado no checkout.
 */
export async function holdPendingSubscription(
  email: string,
  data: SubscriptionData
): Promise<void> {
  await adminDb
    .collection("pendingSubscriptions")
    .doc(emailKey(email))
    .set({
      email: emailKey(email),
      stripeCustomerId: data.stripeCustomerId,
      stripeSubscriptionId: data.stripeSubscriptionId,
      subscriptionPeriodEnd: data.periodEnd,
      createdAt: FieldValue.serverTimestamp(),
    });
}

/**
 * Resgata um pagamento feito antes da conta existir. Chamado quando o usuário
 * conclui o cadastro: se houver pagamento no mesmo e-mail, a assinatura é
 * ativada e a pendência apagada.
 *
 * Devolve true se encontrou e aplicou.
 */
export async function claimPendingSubscription(
  uid: string,
  email: string | null | undefined
): Promise<boolean> {
  if (!email) return false;
  const ref = adminDb.collection("pendingSubscriptions").doc(emailKey(email));
  const snap = await ref.get();
  if (!snap.exists) return false;

  await activateSubscription(adminDb.collection("users").doc(uid), {
    stripeCustomerId: snap.get("stripeCustomerId") ?? null,
    stripeSubscriptionId: snap.get("stripeSubscriptionId") ?? null,
    periodEnd: (snap.get("subscriptionPeriodEnd") as Timestamp | null) ?? null,
  });
  await ref.delete();
  return true;
}
