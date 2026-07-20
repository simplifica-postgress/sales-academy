import { NextResponse } from "next/server";
import { AuthError, requireMaster } from "@/lib/server/adminAuth";
import { adminDb } from "@/lib/server/firebaseAdmin";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROLES: UserRole[] = ["seller", "manager", "master"];

/**
 * Espalha o companyId do vendedor pelos documentos dele (uploads, analyses,
 * progress). As regras do Firestore filtram por esse campo copiado — sem o
 * backfill, o gestor não enxergaria o histórico de quem acabou de ser
 * vinculado à empresa dele.
 */
async function backfillCompany(uid: string, companyId: string | null) {
  for (const col of ["uploads", "analyses"] as const) {
    const snap = await adminDb.collection(col).where("userId", "==", uid).get();
    // Batch do Firestore aceita no máximo 500 operações.
    for (let i = 0; i < snap.docs.length; i += 400) {
      const batch = adminDb.batch();
      for (const d of snap.docs.slice(i, i + 400)) {
        batch.update(d.ref, { companyId });
      }
      await batch.commit();
    }
  }
  const progressRef = adminDb.collection("progress").doc(uid);
  if ((await progressRef.get()).exists) {
    await progressRef.update({ companyId });
  }
}

/**
 * Muda o papel de alguém e/ou vincula a pessoa a uma empresa.
 * Só o master chega aqui: as Rules impedem o cliente de mudar o próprio papel
 * ou a própria empresa (anti-escalada de privilégio).
 */
export async function POST(req: Request) {
  let caller;
  try {
    caller = await requireMaster(req);
  } catch (err) {
    const e = err as AuthError;
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const body = (await req.json()) as {
    uid?: string;
    role?: UserRole;
    companyId?: string | null;
  };
  const uid = body.uid;
  const role = body.role;
  // `undefined` = não mexer na empresa; `null` = desvincular.
  const changingCompany = "companyId" in body;
  const companyId = body.companyId ?? null;

  if (!uid) {
    return NextResponse.json({ error: "Informe o uid." }, { status: 400 });
  }
  if (role !== undefined && !ROLES.includes(role)) {
    return NextResponse.json(
      { error: "Papel inválido. Use seller, manager ou master." },
      { status: 400 }
    );
  }
  // Sem isso, o único master pode se rebaixar e ninguém mais administra nada.
  if (uid === caller.uid && role !== undefined && role !== "master") {
    return NextResponse.json(
      { error: "Você não pode remover o seu próprio acesso master." },
      { status: 400 }
    );
  }

  const ref = adminDb.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json(
      { error: "Usuário não encontrado." },
      { status: 404 }
    );
  }

  if (changingCompany && companyId) {
    const company = await adminDb.collection("companies").doc(companyId).get();
    if (!company.exists) {
      return NextResponse.json(
        { error: "Empresa não encontrada." },
        { status: 404 }
      );
    }
  }

  const patch: Record<string, unknown> = {};
  if (role !== undefined) {
    patch.role = role;
    // Gestor e master não passam pelo onboarding de vendedor.
    if (role !== "seller") patch.profileCompleted = true;
  }
  if (changingCompany) patch.companyId = companyId;

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para alterar." }, { status: 400 });
  }

  await ref.update(patch);
  if (changingCompany) await backfillCompany(uid, companyId);

  return NextResponse.json({ ok: true, uid, ...patch });
}
