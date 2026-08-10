import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/server/firebaseAdmin";
import { stripe, stripeMock } from "@/lib/server/stripeServer";
import type { UserProfile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Cancela a assinatura do próprio usuário — SEMPRE no fim do período pago
 * (quem pagou o mês usa o mês; só a renovação é desligada).
 *
 * Exigências, todas verificadas AQUI (a UI é só conveniência):
 *  - token válido do Firebase;
 *  - body.confirmation === "CANCELAR" (a palavra digitada no segundo modal);
 *  - assinatura ativa (ou com pagamento pendente) do plano Vendedor.
 */
export async function POST(req: Request) {
  // Garante resposta JSON mesmo em erro não previsto (ver /api/analyze).
  try {
    return await handleCancel(req);
  } catch (err) {
    console.error("Erro não tratado em /api/subscription/cancel:", err);
    const detalhe = err instanceof Error ? err.message : "erro inesperado";
    return NextResponse.json(
      { error: `Falha no servidor ao cancelar: ${detalhe}` },
      { status: 500 }
    );
  }
}

async function handleCancel(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(idToken)).uid;
  } catch (err) {
    console.error("Token inválido no cancelamento:", err);
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    confirmation?: string;
  };

  // A palavra é a prova de intenção. Sem ela, nada acontece — nem que a
  // requisição venha de fora da UI.
  if ((body.confirmation ?? "").trim() !== "CANCELAR") {
    return NextResponse.json(
      { error: 'Confirmação inválida: digite exatamente "CANCELAR".' },
      { status: 400 }
    );
  }

  const userRef = adminDb.collection("users").doc(uid);
  const snap = await userRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  }
  const profile = snap.data() as UserProfile;

  if (profile.plan === "enterprise") {
    return NextResponse.json(
      {
        error:
          "O plano Enterprise é gerenciado pelo nosso comercial. Fale com o suporte para alterações.",
      },
      { status: 409 }
    );
  }

  const status = profile.subscriptionStatus ?? null;
  if (status === "canceling") {
    return NextResponse.json(
      { error: "A assinatura já está cancelada — o acesso vai até o fim do período pago." },
      { status: 409 }
    );
  }
  if (status !== "active" && status !== "past_due") {
    return NextResponse.json(
      { error: "Nenhuma assinatura ativa para cancelar." },
      { status: 409 }
    );
  }

  // Fim do período: no Stripe real vem da própria assinatura; no simulado,
  // mantém o que está gravado (ou fecha um ciclo de 30 dias a partir de agora).
  let periodEnd: Timestamp;

  if (stripeMock()) {
    periodEnd =
      (profile.subscriptionPeriodEnd as Timestamp | null | undefined) ??
      Timestamp.fromMillis(Date.now() + 30 * 86_400_000);
  } else {
    const subId = profile.stripeSubscriptionId;
    if (!subId) {
      return NextResponse.json(
        { error: "Não encontramos o vínculo da sua assinatura. Fale com o suporte." },
        { status: 409 }
      );
    }
    try {
      // cancel_at_period_end: o Stripe para de renovar, mas mantém a
      // assinatura viva até o fim do ciclo já pago.
      const sub = await stripe().subscriptions.update(subId, {
        cancel_at_period_end: true,
      });
      const endSec =
        sub.items.data[0]?.current_period_end ?? sub.cancel_at ?? null;
      periodEnd = endSec
        ? Timestamp.fromMillis(endSec * 1000)
        : ((profile.subscriptionPeriodEnd as Timestamp | null | undefined) ??
          Timestamp.fromMillis(Date.now() + 30 * 86_400_000));
    } catch (err) {
      console.error("Stripe recusou o cancelamento:", err);
      return NextResponse.json(
        { error: "Não foi possível concluir o cancelamento agora. Tente de novo ou fale com o suporte." },
        { status: 502 }
      );
    }
  }

  await userRef.update({
    subscriptionStatus: "canceling",
    subscriptionPeriodEnd: periodEnd,
    subscriptionUpdatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    status: "canceling",
    periodEnd: periodEnd.toDate().toISOString(),
  });
}
