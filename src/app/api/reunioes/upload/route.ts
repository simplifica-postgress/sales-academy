import { NextResponse } from "next/server";
import { adminBucket } from "@/lib/server/firebaseAdmin";
import { temAcesso } from "@/lib/server/reunioesAuth";
import { ACCEPTED_AUDIO_TYPES, ACCEPTED_VIDEO_TYPES } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Devolve uma URL temporária para o navegador enviar a gravação DIRETO ao
 * Storage.
 *
 * Reunião gravada passa fácil de 1 GB. Se o arquivo subisse pelo nosso
 * servidor, ele seguraria tudo isso na memória e derrubaria o processo —
 * junto com o Sales Academy, que roda no mesmo lugar. Assim o servidor só
 * assina a permissão; os bytes vão do navegador para o Storage.
 */
export async function POST(req: Request) {
  try {
    if (!(await temAcesso())) {
      return NextResponse.json({ error: "Sem acesso." }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as {
      nome?: string;
      tipo?: string;
    };
    const tipo = (body.tipo ?? "").trim();
    const nome = (body.nome ?? "reuniao").replace(/[^\w.-]/g, "_").slice(-80);

    if (!ACCEPTED_AUDIO_TYPES.includes(tipo) && !ACCEPTED_VIDEO_TYPES.includes(tipo)) {
      return NextResponse.json(
        { error: "Formato não suportado. Envie áudio ou vídeo." },
        { status: 400 }
      );
    }

    // Pasta própria, separada do Sales Academy.
    const caminho = `reunioes-internas/${Date.now()}-${nome}`;
    const [url] = await adminBucket.file(caminho).getSignedUrl({
      version: "v4",
      action: "write",
      expires: Date.now() + 60 * 60 * 1000, // 1h: reunião grande demora a subir
      contentType: tipo,
    });

    return NextResponse.json({ url, caminho });
  } catch (err) {
    console.error("Erro em /api/reunioes/upload:", err);
    const detalhe = err instanceof Error ? err.message : "erro inesperado";
    return NextResponse.json(
      { error: `Não foi possível preparar o envio: ${detalhe}` },
      { status: 500 }
    );
  }
}
