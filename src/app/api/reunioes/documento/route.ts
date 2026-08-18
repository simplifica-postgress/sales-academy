import { NextResponse } from "next/server";
import mammoth from "mammoth";
import { temAcesso } from "@/lib/server/reunioesAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Transcrição de reunião cabe folgado nisto; o limite existe para o servidor
 *  não engolir um arquivo enorme por engano. */
const MAX_BYTES = 12 * 1024 * 1024;

/**
 * Lê a transcrição de um documento (.docx ou .txt) e devolve o texto.
 *
 * Existe porque uma reunião de uma hora dá ~63 mil caracteres: cabe no
 * modelo sem problema, mas colar isso num campo de texto é sofrido e é
 * fácil perder um pedaço no caminho. Como o time já exporta a transcrição
 * da chamada, subir o arquivo é o caminho natural.
 */
export async function POST(req: Request) {
  try {
    if (!(await temAcesso())) {
      return NextResponse.json({ error: "Sem acesso." }, { status: 401 });
    }

    const form = await req.formData();
    const arquivo = form.get("arquivo");
    if (!(arquivo instanceof File)) {
      return NextResponse.json({ error: "Envie um arquivo." }, { status: 400 });
    }
    if (arquivo.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Documento muito grande (máximo 12 MB)." },
        { status: 400 }
      );
    }

    const nome = arquivo.name.toLowerCase();
    const buffer = Buffer.from(await arquivo.arrayBuffer());
    let texto: string;

    if (nome.endsWith(".docx")) {
      // .doc antigo (binário) NÃO é lido por aqui — só o formato novo.
      const { value } = await mammoth.extractRawText({ buffer });
      texto = value;
    } else if (nome.endsWith(".txt") || nome.endsWith(".md") || nome.endsWith(".vtt") || nome.endsWith(".srt")) {
      texto = buffer.toString("utf8");
    } else if (nome.endsWith(".doc")) {
      return NextResponse.json(
        {
          error:
            "Formato .doc antigo não é suportado. Abra no Word e salve como .docx (ou copie para um .txt).",
        },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: "Envie um documento .docx, .txt, .vtt ou .srt." },
        { status: 400 }
      );
    }

    // Legenda (.vtt/.srt) vem com numeração e marcações de tempo que só
    // atrapalham a leitura: limpamos antes de mandar para a IA.
    if (nome.endsWith(".vtt") || nome.endsWith(".srt")) {
      texto = texto
        .replace(/^WEBVTT.*$/gm, "")
        .replace(/^\d+\s*$/gm, "")
        .replace(/^[\d:.,]+\s*-->\s*[\d:.,]+.*$/gm, "")
        .replace(/\n{3,}/g, "\n\n");
    }

    texto = texto.replace(/\r\n/g, "\n").trim();

    if (texto.length < 40) {
      return NextResponse.json(
        { error: "Não encontrei texto neste documento. Ele está vazio?" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      texto,
      caracteres: texto.length,
      arquivo: arquivo.name,
    });
  } catch (err) {
    console.error("Erro em /api/reunioes/documento:", err);
    const detalhe = err instanceof Error ? err.message : "erro inesperado";
    return NextResponse.json(
      { error: `Não foi possível ler o documento: ${detalhe}` },
      { status: 500 }
    );
  }
}
