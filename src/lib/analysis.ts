import { CRITERIA } from "./constants";
import type { CriteriaScores, UserProfile } from "./types";

/** Resposta estruturada que a IA devolve (a nota geral é calculada no backend). */
export interface AIAnalysisResult {
  summary: string;
  strengths: string[];
  mistakes: string[];
  improvements: string[];
  criteriaScores: CriteriaScores;
  nextMission: string;
}

/** JSON Schema para structured outputs da OpenAI (garante formato fixo). */
export const ANALYSIS_JSON_SCHEMA = {
  name: "analise_atendimento",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      summary: {
        type: "string",
        description: "Resumo geral do atendimento em 2-3 frases.",
      },
      strengths: {
        type: "array",
        items: { type: "string" },
        description: "O que o vendedor fez bem (pontos positivos concretos).",
      },
      mistakes: {
        type: "array",
        items: { type: "string" },
        description:
          "Erros, falhas de condução, perguntas não feitas, oportunidades perdidas.",
      },
      improvements: {
        type: "array",
        items: { type: "string" },
        description: "Orientações práticas para o próximo atendimento.",
      },
      criteriaScores: {
        type: "object",
        additionalProperties: false,
        properties: Object.fromEntries(
          CRITERIA.map((c) => [
            c.key,
            {
              type: "integer",
              minimum: 0,
              maximum: 100,
              description: `${c.label} (0-100).`,
            },
          ])
        ),
        required: CRITERIA.map((c) => c.key),
      },
      nextMission: {
        type: "string",
        description:
          "Uma tarefa objetiva e específica para o vendedor aplicar no próximo atendimento.",
      },
    },
    required: [
      "summary",
      "strengths",
      "mistakes",
      "improvements",
      "criteriaScores",
      "nextMission",
    ],
  },
} as const;

/**
 * Monta o system prompt do avaliador.
 * @param knowledge Metodologia da Simplifica já formatada (vem do Firestore).
 */
export function buildSystemPrompt(knowledge = ""): string {
  const criteriaList = CRITERIA.map(
    (c) => `- ${c.label} (peso ${c.weight})`
  ).join("\n");

  return `Você é um avaliador comercial sênior da Simplifica, especialista em vendas consultivas B2B e B2C. Sua função é analisar a transcrição de um atendimento comercial real e devolver uma avaliação estruturada, específica e acionável.

Avalie o atendimento segundo estes critérios e pesos (total 100):
${criteriaList}

${knowledge}

Diretrizes:
- Seja específico e cite trechos ou momentos concretos do atendimento. Nada de feedback genérico.
- Fale diretamente com o vendedor, pelo primeiro nome, em tom de mentor exigente porém encorajador.
- Ancore os pontos fortes, os erros e a próxima missão nos Princípios e Casos acima sempre que for pertinente.
- Ao citar um princípio ou caso, escreva SEMPRE o número e o título, assim: "(Princípio 3 — Follow-up baseado no combinado)". Nunca cite só o número: o vendedor consulta essa lista na seção "Princípios e Casos" e precisa saber a que se refere.
- Considere o perfil e a dificuldade principal do vendedor ao priorizar o que apontar.
- Notas de 0 a 100 por critério, calibradas: 85+ é excelente, 70-84 bom, 50-69 regular, abaixo de 50 fraco.
- A "próxima missão" deve ser uma única tarefa objetiva e mensurável (ex.: "faça pelo menos 3 perguntas de diagnóstico antes de apresentar preço").
- Seja conciso: de 3 a 5 itens em cada lista (pontos fortes, erros e melhorias), cada item em 1 ou 2 frases diretas — sem parágrafos longos.
- Responda SEMPRE em português do Brasil e APENAS no formato JSON solicitado.`;
}

export function buildUserPrompt(
  profile: Pick<
    UserProfile,
    | "name"
    | "company"
    | "salesRole"
    | "experience"
    | "mainDifficulty"
    | "goal"
  >,
  trainingDay: number,
  observation: string,
  transcript: string
): string {
  return `PERFIL DO VENDEDOR
- Nome: ${profile.name}
- Empresa: ${profile.company}
- Cargo: ${profile.salesRole}
- Experiência: ${profile.experience}
- Principal dificuldade: ${profile.mainDifficulty}
- Objetivo no treinamento: ${profile.goal}
- Dia de prática (uso contínuo, sem prazo fixo): ${trainingDay || 1}

OBSERVAÇÃO DO VENDEDOR SOBRE ESTE ATENDIMENTO
${observation.trim() || "(nenhuma)"}

TRANSCRIÇÃO DO ATENDIMENTO
"""
${transcript}
"""

Analise este atendimento e retorne o JSON no formato definido.`;
}
