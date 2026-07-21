import { NextResponse } from "next/server";
import { AuthError, requireStaff, type Caller } from "@/lib/server/adminAuth";
import { adminBucket } from "@/lib/server/firebaseAdmin";
import { analyze, transcribe } from "@/lib/server/openai";
import { getKnowledgeText } from "@/lib/server/knowledge";
import {
  ACCEPTED_AUDIO_TYPES,
  ACCEPTED_VIDEO_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Transcrever áudio longo demora bem mais que analisar texto colado.
export const maxDuration = 300;

/**
 * Laboratório da IA: roda a análise em uma transcrição colada OU num arquivo
 * de áudio/vídeo enviado, SEM salvar nada (não conta como treino de ninguém).
 *
 * O arquivo de teste é apagado do Storage assim que a transcrição sai: é um
 * teste, não um registro de treinamento — não faz sentido guardar a gravação.
 */
export async function POST(req: Request) {
  let caller: Caller;
  try {
    caller = await requireStaff(req);
  } catch (err) {
    const e = err as AuthError;
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const body = (await req.json()) as {
    transcript?: string;
    filePath?: string;
    sellerName?: string;
    mainDifficulty?: string;
    observation?: string;
    trainingDay?: number;
  };

  let transcript = (body.transcript ?? "").trim();
  const filePath = (body.filePath ?? "").trim();
  let transcribedFrom: string | null = null;

  if (filePath) {
    // Só a própria pasta: impede pedir a transcrição do arquivo de outro.
    if (!filePath.startsWith(`uploads/${caller.uid}/`)) {
      return NextResponse.json(
        { error: "Caminho de arquivo inválido." },
        { status: 403 }
      );
    }
    const file = adminBucket.file(filePath);
    const [exists] = await file.exists();
    if (!exists) {
      return NextResponse.json(
        { error: "Arquivo não encontrado no Storage." },
        { status: 404 }
      );
    }
    const [meta] = await file.getMetadata();
    const mimeType = meta.contentType ?? "";
    const size = Number(meta.size ?? 0);

    if (size > MAX_UPLOAD_BYTES) {
      return NextResponse.json(
        { error: "Arquivo muito grande (máximo 500 MB)." },
        { status: 400 }
      );
    }
    if (
      !ACCEPTED_AUDIO_TYPES.includes(mimeType) &&
      !ACCEPTED_VIDEO_TYPES.includes(mimeType)
    ) {
      return NextResponse.json(
        { error: "Formato não suportado. Envie áudio ou vídeo." },
        { status: 400 }
      );
    }

    try {
      const [buffer] = await file.download();
      transcript = (
        await transcribe(buffer, filePath.split("/").pop() ?? "audio", mimeType)
      ).trim();
      transcribedFrom = meta.name ?? filePath;
    } catch (err) {
      console.error("Falha ao transcrever o arquivo de teste:", err);
      return NextResponse.json(
        { error: "Não foi possível transcrever o arquivo." },
        { status: 500 }
      );
    } finally {
      // Teste não guarda gravação.
      await file.delete().catch(() => {});
    }
  }

  if (transcript.length < 20) {
    return NextResponse.json(
      {
        error: filePath
          ? "Não foi possível entender o áudio. Verifique a gravação."
          : "Cole uma transcrição com pelo menos 20 caracteres.",
      },
      { status: 400 }
    );
  }

  // Perfil fictício para dar contexto à IA (o teste não afeta ninguém).
  const profile = {
    name: body.sellerName?.trim() || "Vendedor",
    company: "Simplifica",
    salesRole: "Vendedor",
    experience: "—",
    mainDifficulty: body.mainDifficulty?.trim() || "—",
    goal: "Melhorar a performance comercial",
  };

  try {
    const { result, generalScore } = await analyze(
      profile,
      body.trainingDay ?? 1,
      body.observation ?? "",
      transcript
    );
    const knowledge = await getKnowledgeText();

    return NextResponse.json({
      result,
      generalScore,
      mock: process.env.AI_MOCK === "true",
      knowledgeChars: knowledge.length,
      // Devolve a transcrição quando veio de arquivo, para o gestor conferir
      // o que a IA de fato "ouviu".
      transcript: transcribedFrom ? transcript : undefined,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha ao analisar a transcrição.";
    console.error("Erro no teste da IA:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
