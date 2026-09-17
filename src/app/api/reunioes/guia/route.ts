import { NextResponse } from "next/server";
import { temAcesso } from "@/lib/server/reunioesAuth";
import {
  GUIA_MAX,
  GUIA_MIN,
  GUIA_PADRAO,
  lerGuia,
  listarVersoes,
  restaurarVersao,
  salvarGuia,
} from "@/lib/server/reunioesGuia";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * O guia que a IA usa para julgar reuniões. Qualquer pessoa com a senha do
 * time lê e edita; cada troca guarda a versão anterior.
 *
 * Só mexe nas coleções do guia de REUNIÃO — a base do Sales Academy não
 * passa por aqui.
 */
export async function GET() {
  try {
    if (!(await temAcesso())) {
      return NextResponse.json({ error: "Sem acesso." }, { status: 401 });
    }
    const [atual, versoes] = await Promise.all([lerGuia(), listarVersoes()]);
    return NextResponse.json({ atual, versoes, padrao: GUIA_PADRAO, min: GUIA_MIN, max: GUIA_MAX });
  } catch (err) {
    console.error("Erro em GET /api/reunioes/guia:", err);
    return NextResponse.json({ error: "Não foi possível carregar o guia." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    if (!(await temAcesso())) {
      return NextResponse.json({ error: "Sem acesso." }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      texto?: string;
      autor?: string;
      restaurar?: string;
      voltarAoPadrao?: boolean;
    };
    const autor = (body.autor ?? "").trim().slice(0, 60) || null;

    if (body.restaurar) {
      const ok = await restaurarVersao(body.restaurar, autor);
      if (!ok) {
        return NextResponse.json({ error: "Versão não encontrada." }, { status: 404 });
      }
      return NextResponse.json({ ok: true, atual: await lerGuia() });
    }

    const texto = body.voltarAoPadrao ? GUIA_PADRAO : (body.texto ?? "").trim();

    // Piso de tamanho: um guia quase vazio faria a IA avaliar sem régua
    // nenhuma — e é o que sobra de um Ctrl+A + Delete por engano.
    if (texto.length < GUIA_MIN) {
      return NextResponse.json(
        { error: `O guia ficou curto demais (mínimo de ${GUIA_MIN} caracteres). Nada foi salvo.` },
        { status: 400 }
      );
    }
    if (texto.length > GUIA_MAX) {
      return NextResponse.json(
        { error: `O guia passou de ${GUIA_MAX.toLocaleString("pt-BR")} caracteres. Enxugue um pouco antes de salvar.` },
        { status: 400 }
      );
    }

    await salvarGuia(texto, autor);
    return NextResponse.json({ ok: true, atual: await lerGuia() });
  } catch (err) {
    console.error("Erro em POST /api/reunioes/guia:", err);
    return NextResponse.json({ error: "Não foi possível salvar o guia." }, { status: 500 });
  }
}
