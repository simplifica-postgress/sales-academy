import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { temAcesso } from "@/lib/server/reunioesAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Histórico e detalhe. Passa pelo servidor (e não direto do navegador ao
 * banco) porque não há usuário logado: quem autoriza é o cookie do time,
 * que só o servidor sabe conferir.
 */
export async function GET(req: Request) {
  try {
    if (!(await temAcesso())) {
      return NextResponse.json({ error: "Sem acesso." }, { status: 401 });
    }

    const id = new URL(req.url).searchParams.get("id");

    if (id) {
      const doc = await adminDb.collection("reunioes").doc(id).get();
      if (!doc.exists) {
        return NextResponse.json({ error: "Análise não encontrada." }, { status: 404 });
      }
      const d = doc.data()!;
      return NextResponse.json({
        analise: {
          id: doc.id,
          ...d,
          criadoEm: d.criadoEm?.toDate?.().toISOString() ?? null,
        },
      });
    }

    const snap = await adminDb
      .collection("reunioes")
      .orderBy("criadoEm", "desc")
      .limit(100)
      .get();

    return NextResponse.json({
      reunioes: snap.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          titulo: d.titulo ?? "Reunião",
          participantes: d.participantes ?? "",
          notaGeral: d.notaGeral ?? 0,
          probabilidadeFechamento: d.probabilidadeFechamento ?? "baixa",
          criadoEm: d.criadoEm?.toDate?.().toISOString() ?? null,
        };
      }),
    });
  } catch (err) {
    console.error("Erro em /api/reunioes/lista:", err);
    const detalhe = err instanceof Error ? err.message : "erro inesperado";
    return NextResponse.json({ error: `Falha ao carregar: ${detalhe}` }, { status: 500 });
  }
}
