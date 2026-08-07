import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/server/firebaseAdmin";
import { stripeMock } from "@/lib/server/stripeServer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * SÓ NO MODO SIMULADO (STRIPE_MOCK=true): ativa ou zera uma assinatura de
 * teste, para exercitar o fluxo inteiro sem Stripe. Com o Stripe real
 * configurado esta rota simplesmente não existe (404) — ninguém se dá
 * assinatura de graça em produção.
 */
export async function POST(req: Request) {
  try {
    if (!stripeMock()) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }
    return await handleMock(req);
  } catch (err) {
    console.error("Erro não tratado em /api/subscription/mock:", err);
    const detalhe = err instanceof Error ? err.message : "erro inesperado";
    return NextResponse.json(
      { error: `Falha no servidor: ${detalhe}` },
      { status: 500 }
    );
  }
}

async function handleMock(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    action?: "activate" | "reset";
  };
  const action = body.action ?? "activate";

  const userRef = adminDb.collection("users").doc(uid);
  if (!(await userRef.get()).exists) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  }

  if (action === "reset") {
    // Volta ao estado "nunca assinou" — útil para repetir os testes.
    await userRef.update({
      plan: FieldValue.delete(),
      subscriptionStatus: FieldValue.delete(),
      stripeCustomerId: FieldValue.delete(),
      stripeSubscriptionId: FieldValue.delete(),
      subscriptionPeriodEnd: FieldValue.delete(),
      subscriptionUpdatedAt: FieldValue.delete(),
    });
    return NextResponse.json({ status: "none" });
  }

  const periodEnd = Timestamp.fromMillis(Date.now() + 30 * 86_400_000);
  await userRef.update({
    plan: "vendedor",
    subscriptionStatus: "active",
    stripeCustomerId: `mock_cus_${uid.slice(0, 8)}`,
    stripeSubscriptionId: `mock_sub_${uid.slice(0, 8)}`,
    subscriptionPeriodEnd: periodEnd,
    subscriptionUpdatedAt: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({
    status: "active",
    periodEnd: periodEnd.toDate().toISOString(),
  });
}
