import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { AuthError, requireMaster } from "@/lib/server/adminAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Marca (ou desmarca) uma EMPRESA inteira como plano Empresarial.
 *
 * O plano Empresarial é vendido por fora: o gestor paga por contrato direto,
 * não passa pelo checkout. Como não existe pagamento no Stripe para amarrar,
 * é o master quem declara — e todo mundo daquela empresa passa a ter acesso.
 *
 * Só o master pode chamar (mesma regra de papéis e vínculos).
 */
export async function POST(req: Request) {
  try {
    return await handleSetPlan(req);
  } catch (err) {
    console.error("Erro não tratado em /api/admin/set-plan:", err);
    const detalhe = err instanceof Error ? err.message : "erro inesperado";
    return NextResponse.json({ error: `Falha no servidor: ${detalhe}` }, { status: 500 });
  }
}

async function handleSetPlan(req: Request) {
  try {
    await requireMaster(req);
  } catch (err) {
    const e = err as AuthError;
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const body = (await req.json().catch(() => ({}))) as {
    companyId?: string;
    enterprise?: boolean;
  };
  const companyId = (body.companyId ?? "").trim();
  const virarEnterprise = body.enterprise === true;

  if (!companyId) {
    return NextResponse.json({ error: "Informe a empresa." }, { status: 400 });
  }
  if (!(await adminDb.collection("companies").doc(companyId).get()).exists) {
    return NextResponse.json({ error: "Empresa não encontrada." }, { status: 404 });
  }

  const membros = await adminDb
    .collection("users")
    .where("companyId", "==", companyId)
    .get();

  if (membros.empty) {
    return NextResponse.json(
      { error: "Esta empresa ainda não tem ninguém vinculado." },
      { status: 409 }
    );
  }

  // Em lotes: uma empresa grande passa do limite de escritas por transação.
  let alterados = 0;
  for (let i = 0; i < membros.docs.length; i += 400) {
    const lote = adminDb.batch();
    for (const d of membros.docs.slice(i, i + 400)) {
      lote.update(d.ref, {
        plan: virarEnterprise ? "enterprise" : FieldValue.delete(),
        subscriptionUpdatedAt: FieldValue.serverTimestamp(),
      });
      alterados++;
    }
    await lote.commit();
  }

  return NextResponse.json({ ok: true, alterados, enterprise: virarEnterprise });
}
