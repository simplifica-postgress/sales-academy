import { NextResponse } from "next/server";
import { AuthError, requireStaff } from "@/lib/server/adminAuth";
import { analyze } from "@/lib/server/openai";
import { getKnowledgeText } from "@/lib/server/knowledge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * Laboratório da IA: roda a análise em uma transcrição colada pelo gestor,
 * SEM salvar nada (não conta como treino de nenhum vendedor).
 */
export async function POST(req: Request) {
  try {
    await requireStaff(req);
  } catch (err) {
    const e = err as AuthError;
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const body = (await req.json()) as {
    transcript?: string;
    sellerName?: string;
    mainDifficulty?: string;
    observation?: string;
    trainingDay?: number;
  };

  const transcript = (body.transcript ?? "").trim();
  if (transcript.length < 20) {
    return NextResponse.json(
      { error: "Cole uma transcrição com pelo menos 20 caracteres." },
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
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha ao analisar a transcrição.";
    console.error("Erro no teste da IA:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
