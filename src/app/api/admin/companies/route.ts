import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { AuthError, requireMaster } from "@/lib/server/adminAuth";
import { adminDb } from "@/lib/server/firebaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Empresas ("pastas") do painel master: criar, renomear e excluir.
 * Só o master chega aqui — o gestor não organiza empresas.
 */
export async function POST(req: Request) {
  try {
    await requireMaster(req);
  } catch (err) {
    const e = err as AuthError;
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const { action, companyId, name } = (await req.json()) as {
    action?: "create" | "rename" | "delete";
    companyId?: string;
    name?: string;
  };

  if (action === "create") {
    const clean = (name ?? "").trim();
    if (!clean) {
      return NextResponse.json(
        { error: "Informe o nome da empresa." },
        { status: 400 }
      );
    }
    const ref = await adminDb.collection("companies").add({
      name: clean,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    return NextResponse.json({ ok: true, companyId: ref.id, name: clean });
  }

  if (!companyId) {
    return NextResponse.json({ error: "Informe a empresa." }, { status: 400 });
  }
  const ref = adminDb.collection("companies").doc(companyId);
  if (!(await ref.get()).exists) {
    return NextResponse.json(
      { error: "Empresa não encontrada." },
      { status: 404 }
    );
  }

  if (action === "rename") {
    const clean = (name ?? "").trim();
    if (!clean) {
      return NextResponse.json(
        { error: "Informe o novo nome." },
        { status: 400 }
      );
    }
    await ref.update({ name: clean, updatedAt: FieldValue.serverTimestamp() });
    return NextResponse.json({ ok: true, companyId, name: clean });
  }

  if (action === "delete") {
    // Excluir a pasta não pode apagar pessoas nem histórico: as pessoas
    // apenas voltam para "sem empresa", e o companyId copiado nos documentos
    // delas é limpo junto, senão ficariam presas a uma empresa inexistente.
    const members = await adminDb
      .collection("users")
      .where("companyId", "==", companyId)
      .get();

    for (const m of members.docs) {
      await m.ref.update({ companyId: null });
      for (const col of ["uploads", "analyses"] as const) {
        const docs = await adminDb
          .collection(col)
          .where("userId", "==", m.id)
          .get();
        for (let i = 0; i < docs.docs.length; i += 400) {
          const batch = adminDb.batch();
          for (const d of docs.docs.slice(i, i + 400)) {
            batch.update(d.ref, { companyId: null });
          }
          await batch.commit();
        }
      }
      const prog = adminDb.collection("progress").doc(m.id);
      if ((await prog.get()).exists) await prog.update({ companyId: null });
    }

    await ref.delete();
    return NextResponse.json({ ok: true, released: members.size });
  }

  return NextResponse.json({ error: "Ação inválida." }, { status: 400 });
}
