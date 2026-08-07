import { NextResponse } from "next/server";
import type { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/server/firebaseAdmin";
import { claimPendingSubscription } from "@/lib/server/subscriptionLink";
import type { UserProfile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diz se ESTA conta já tem acesso pago — é o que decide, depois do login,
 * se a pessoa entra direto no app ou se é levada ao pagamento.
 *
 * Antes de responder, tenta resgatar uma compra feita no mesmo e-mail: quem
 * paga e volta pelo redirecionamento do Stripe pode chegar aqui um instante
 * antes de o webhook gravar. Sem esse resgate, mandaríamos pagar de novo
 * alguém que acabou de pagar.
 */
export async function POST(req: Request) {
  try {
    return await handleStatus(req);
  } catch (err) {
    console.error("Erro não tratado em /api/subscription/status:", err);
    const detalhe = err instanceof Error ? err.message : "erro inesperado";
    return NextResponse.json(
      { error: `Falha no servidor: ${detalhe}` },
      { status: 500 }
    );
  }
}

async function handleStatus(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let uid: string;
  let tokenEmail: string | null = null;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
    tokenEmail = decoded.email ?? null;
  } catch {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  const userRef = adminDb.collection("users").doc(uid);
  let snap = await userRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  }

  // Compra feita antes da conta existir (veio da landing page).
  let profile = snap.data() as UserProfile;
  if (!profile.subscriptionStatus) {
    const resgatou = await claimPendingSubscription(
      uid,
      profile.email ?? tokenEmail
    );
    if (resgatou) {
      snap = await userRef.get();
      profile = snap.data() as UserProfile;
    }
  }

  const status = profile.subscriptionStatus ?? null;
  const end = (profile.subscriptionPeriodEnd ?? null) as Timestamp | null;

  // Mesma regra do cliente (lib/subscription): enterprise sempre tem acesso;
  // cancelada mantém até o fim do período pago.
  let paid = false;
  if (profile.plan === "enterprise") paid = true;
  else if (status === "active" || status === "past_due") paid = true;
  else if (status === "canceling") paid = !!end && end.toMillis() > Date.now();

  return NextResponse.json({
    paid,
    plan: profile.plan ?? null,
    status,
    profileCompleted: profile.profileCompleted === true,
    role: profile.role ?? "seller",
    periodEnd: end ? end.toDate().toISOString() : null,
  });
}
