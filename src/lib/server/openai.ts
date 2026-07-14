import "server-only";
import OpenAI, { toFile } from "openai";
import {
  ANALYSIS_JSON_SCHEMA,
  buildSystemPrompt,
  buildUserPrompt,
  type AIAnalysisResult,
} from "@/lib/analysis";
import { weightedGeneralScore } from "@/lib/constants";
import type { UserProfile } from "@/lib/types";
import { prepareAudioChunks } from "./audio";

const TRANSCRIBE_MODEL = "whisper-1";
const ANALYSIS_MODEL = "gpt-4o";

let client: OpenAI | null = null;
function openai(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY ausente no ambiente do servidor.");
  }
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

/** Transcreve o arquivo (áudio ou vídeo), dividindo em blocos se necessário. */
export async function transcribe(
  input: Buffer,
  originalName: string
): Promise<string> {
  const chunks = await prepareAudioChunks(input, originalName);
  const parts: string[] = [];
  for (const chunk of chunks) {
    const file = await toFile(chunk.data, chunk.filename, {
      type: "audio/mpeg",
    });
    const res = await openai().audio.transcriptions.create({
      file,
      model: TRANSCRIBE_MODEL,
      language: "pt",
    });
    parts.push(res.text.trim());
  }
  return parts.join("\n").trim();
}

/** Gera a análise estruturada e recalcula a nota geral pelos pesos. */
export async function analyze(
  profile: Pick<
    UserProfile,
    "name" | "company" | "salesRole" | "experience" | "mainDifficulty" | "goal"
  >,
  trainingDay: number,
  observation: string,
  transcript: string
): Promise<{ result: AIAnalysisResult; generalScore: number }> {
  const completion = await openai().chat.completions.create({
    model: ANALYSIS_MODEL,
    temperature: 0.3,
    messages: [
      { role: "system", content: buildSystemPrompt() },
      {
        role: "user",
        content: buildUserPrompt(profile, trainingDay, observation, transcript),
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: ANALYSIS_JSON_SCHEMA,
    },
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) throw new Error("A IA não retornou conteúdo.");

  const result = JSON.parse(raw) as AIAnalysisResult;
  // A nota geral é sempre recalculada no backend (não confia no número da IA).
  const generalScore = weightedGeneralScore(result.criteriaScores);
  return { result, generalScore };
}
