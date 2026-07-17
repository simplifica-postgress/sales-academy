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
import { getKnowledgeText } from "./knowledge";

const TRANSCRIBE_MODEL = "whisper-1";
const ANALYSIS_MODEL = "gpt-4o";

/**
 * Modo simulado: quando AI_MOCK=true, o pipeline devolve uma transcrição e
 * análise de exemplo sem chamar a OpenAI. Útil para desenvolver/demonstrar
 * sem consumir créditos. A nota geral continua sendo calculada de verdade.
 */
const MOCK = process.env.AI_MOCK === "true";

const MOCK_TRANSCRIPT = `Vendedor: Oi, bom dia! Aqui é o Thiago, da Simplifica, tudo bem? Recebi seu contato pedindo informação sobre a consultoria comercial.
Cliente: Oi, tudo bem. É, eu queria entender melhor como funciona.
Vendedor: Perfeito. Deixa eu te perguntar rapidinho: hoje quantos vendedores você tem no time?
Cliente: A gente tem quatro vendedores.
Vendedor: E qual tem sido o maior gargalo de vocês nas vendas atualmente?
Cliente: Olha, a gente até gera bastante lead, mas na hora de fechar trava muito. O pessoal some depois que passa o preço.
Vendedor: Entendi. Olha, a gente tem um método que trabalha exatamente isso, a condução até o fechamento. O investimento é de dois mil reais por mês. O que você acha, fechamos?
Cliente: Hmm, preciso pensar, é um valor considerável.
Vendedor: Sem problema, qualquer coisa me chama.`;

const MOCK_RESULT: AIAnalysisResult = {
  summary:
    "Thiago, você abriu bem e fez boas perguntas iniciais de diagnóstico, mas apresentou preço cedo demais e não aprofundou a dor antes de propor a solução, o que abriu espaço para o clássico 'vou pensar'.",
  strengths: [
    "Abertura cordial e objetiva, se apresentando e conectando ao contato anterior.",
    "Fez duas boas perguntas de diagnóstico (tamanho do time e principal gargalo).",
    "Identificou um sinal de dor claro: leads que somem depois do preço.",
  ],
  mistakes: [
    "Apresentou o preço logo após ouvir a dor, sem construir valor antes.",
    "Não explorou o impacto financeiro do gargalo (quanto essa perda custa por mês).",
    "Aceitou o 'preciso pensar' sem tentar entender a real objeção nem marcar próximo passo.",
  ],
  improvements: [
    "Antes de falar preço, aprofunde a dor com perguntas de consequência e valor.",
    "Sempre encerre com um próximo passo agendado (data e hora), não um 'me chama'.",
  ],
  criteriaScores: {
    abertura: 82,
    clareza: 78,
    diagnostico: 68,
    dor: 60,
    valor: 45,
    objecoes: 40,
    proximoPasso: 38,
    fechamento: 50,
  },
  nextMission:
    "No próximo atendimento, antes de mencionar qualquer preço, faça pelo menos 3 perguntas de diagnóstico (cenário atual, problema e consequência financeira) e só apresente a solução depois que o cliente confirmar a dor.",
};

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
  originalName: string,
  mimeType = ""
): Promise<string> {
  if (MOCK) return MOCK_TRANSCRIPT;
  const chunks = await prepareAudioChunks(input, originalName, mimeType);
  const parts: string[] = [];
  for (const chunk of chunks) {
    const file = await toFile(chunk.data, chunk.filename);
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
  if (MOCK) {
    return {
      result: MOCK_RESULT,
      generalScore: weightedGeneralScore(MOCK_RESULT.criteriaScores),
    };
  }

  // Metodologia da Simplifica (Firestore, editável pelo painel do gestor).
  const knowledge = await getKnowledgeText();

  const completion = await openai().chat.completions.create({
    model: ANALYSIS_MODEL,
    temperature: 0.3,
    messages: [
      { role: "system", content: buildSystemPrompt(knowledge) },
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
