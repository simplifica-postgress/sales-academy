import { NextResponse } from "next/server";
import {
  darAcesso,
  reunioesLigado,
  senhaConfere,
  temAcesso,
  tirarAcesso,
} from "@/lib/server/reunioesAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Diz se quem está pedindo já tem acesso (a tela usa para decidir o que mostrar). */
export async function GET() {
  if (!reunioesLigado()) {
    return NextResponse.json({ configurado: false, liberado: false });
  }
  return NextResponse.json({ configurado: true, liberado: await temAcesso() });
}

/** Entrar com a senha do time, ou sair. */
export async function POST(req: Request) {
  try {
    if (!reunioesLigado()) {
      return NextResponse.json(
        { error: "Ferramenta não configurada neste servidor." },
        { status: 503 }
      );
    }

    const body = (await req.json().catch(() => ({}))) as {
      senha?: string;
      sair?: boolean;
    };

    if (body.sair) {
      await tirarAcesso();
      return NextResponse.json({ liberado: false });
    }

    if (!senhaConfere(body.senha ?? "")) {
      // Atraso pequeno: encarece tentar senha por força bruta sem
      // atrapalhar quem só errou de digitação.
      await new Promise((r) => setTimeout(r, 600));
      return NextResponse.json({ error: "Senha incorreta." }, { status: 401 });
    }

    await darAcesso();
    return NextResponse.json({ liberado: true });
  } catch (err) {
    console.error("Erro em /api/reunioes/entrar:", err);
    return NextResponse.json({ error: "Falha no servidor." }, { status: 500 });
  }
}
