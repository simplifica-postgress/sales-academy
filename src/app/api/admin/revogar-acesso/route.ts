import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { AuthError, requireMaster } from "@/lib/server/adminAuth";
import { stripe, stripeMock } from "@/lib/server/stripeServer";
import type { UserProfile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Encerra o acesso de alguém na mão (só master).
 *
 * Faz as três coisas que precisam andar juntas, senão sobra inconsistência:
 *  1. tira a cortesia (senão a pessoa continuaria entrando de graça);
 *  2. marca a assinatura como encerrada (perde o acesso na hora);
 *  3. CANCELA no Stripe, se houver assinatura ativa — sem isso o cartão
 *     continuaria sendo cobrado todo mês por um acesso que não existe mais,
 *     que é a pior combinação possível.
 *
 * Reversível: `restaurar: true` devolve a cortesia.
 */
export async function POST(req: Request) {
  try {
    return await handleRevogar(req);
  } catch (err) {
    console.error("Erro não tratado em /api/admin/revogar-acesso:", err);
    const detalhe = err instanceof Error ? err.message : "erro inesperado";
    return NextResponse.json({ error: `Falha no servidor: ${detalhe}` }, { status: 500 });
  }
}

async function handleRevogar(req: Request) {
  let caller;
  try {
    caller = await requireMaster(req);
  } catch (err) {
    const e = err as AuthError;
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    uid?: string;
    restaurar?: boolean;
  };
  const uid = (body.uid ?? "").trim();
  const restaurar = body.restaurar === true;

  if (!uid) {
    return NextResponse.json({ error: "Informe o uid." }, { status: 400 });
  }
  // Sem isto, o master se corta do próprio painel e ninguém mais administra.
  if (uid === caller.uid) {
    return NextResponse.json(
      { error: "Você não pode encerrar o próprio acesso." },
      { status: 400 }
    );
  }

  const ref = adminDb.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Conta não encontrada." }, { status: 404 });
  }
  const profile = snap.data() as UserProfile;

  if (restaurar) {
    await ref.update({
      courtesyAccess: true,
      subscriptionUpdatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true, acao: "restaurado" });
  }

  // Para de cobrar antes de tirar o acesso.
  let stripeCancelado = false;
  let avisoStripe: string | null = null;
  const subId = profile.stripeSubscriptionId;
  const tinhaAssinaturaViva =
    profile.subscriptionStatus === "active" || profile.subscriptionStatus === "past_due";

  if (subId && tinhaAssinaturaViva && !stripeMock()) {
    try {
      // Encerra JÁ (não no fim do período): o acesso está sendo cortado agora,
      // então continuar cobrando até o fim do ciclo seria cobrar por nada.
      await stripe().subscriptions.cancel(subId);
      stripeCancelado = true;
    } catch (err) {
      console.error("Falha ao cancelar a assinatura no Stripe:", subId, err);
      avisoStripe =
        "O acesso foi encerrado, mas a cobrança recorrente não pôde ser cancelada automaticamente. Cancele no painel do Stripe para não cobrar de novo.";
    }
  }

  await ref.update({
    courtesyAccess: FieldValue.delete(),
    plan: FieldValue.delete(),
    subscriptionStatus: "canceled",
    subscriptionPeriodEnd: FieldValue.delete(),
    subscriptionUpdatedAt: FieldValue.serverTimestamp(),
  });

  return NextResponse.json({
    ok: true,
    acao: "encerrado",
    stripeCancelado,
    aviso: avisoStripe,
  });
}
