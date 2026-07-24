import { CRITERIA, mediumLabel, type AttendanceMedium } from "./constants";
import type { CriteriaScores, CriterionKey, UserProfile } from "./types";

/** Resposta estruturada que a IA devolve (a nota geral é calculada no backend). */
export interface AIAnalysisResult {
  summary: string;
  strengths: string[];
  mistakes: string[];
  improvements: string[];
  criteriaScores: CriteriaScores;
  /** Critério que a missão ataca — deve ser o de menor nota. */
  missionFocus: CriterionKey;
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
      missionFocus: {
        type: "string",
        enum: CRITERIA.map((c) => c.key),
        description:
          "Critério que a missão ataca. DEVE ser o de menor nota neste atendimento (em empate, o de maior peso).",
      },
      nextMission: {
        type: "string",
        description:
          "Tarefa única, objetiva e mensurável, derivada DESTE atendimento e focada no critério de missionFocus. Deve citar algo concreto que aconteceu na conversa.",
      },
    },
    required: [
      "summary",
      "strengths",
      "mistakes",
      "improvements",
      "criteriaScores",
      "missionFocus",
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

PRÓXIMA MISSÃO — leia com atenção, é onde as análises costumam ficar repetitivas:
- Primeiro identifique o critério de MENOR nota deste atendimento (em empate, o de maior peso) e informe-o em "missionFocus". A missão tem de atacar ESSE critério.
- Se o vendedor foi bem em diagnóstico, a missão NÃO pode ser sobre fazer perguntas de diagnóstico. Missão é o próximo degrau dele, não uma lição genérica.
- A missão precisa citar algo CONCRETO desta conversa (o que o cliente falou, o momento em que travou, a objeção que apareceu). Se a missão pudesse ser colada em outro atendimento qualquer, está errada — reescreva.
- Uma tarefa só, objetiva e verificável no próximo atendimento.
- Varie a forma. Missões válidas para critérios diferentes, como referência de FORMATO (não copie o conteúdo):
  · valor: "Antes de citar preço, conecte a mentoria à frase dele sobre perder venda por objeção e explique em 2 frases o que muda na prática."
  · objeções: "Quando ouvir 'vou pensar', pergunte o que exatamente ele vai avaliar e responda essa dúvida antes de encerrar."
  · próximo passo: "Encerre com data e hora definidas e confirme em voz alta o combinado antes de desligar."
  · dor: "Peça um número que dimensione o problema (quantas vendas perde por mês) e repita esse número ao propor a solução."
  · fechamento: "Faça o convite para a reunião de forma direta, sem perguntar se ele 'quer pensar', e aguarde a resposta em silêncio."
  · abertura: "Nos primeiros 20 segundos, diga por que está ligando e retome de onde veio o contato."
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
  transcript: string,
  medium: AttendanceMedium = "audio"
): string {
  return `PERFIL DO VENDEDOR
- Nome: ${profile.name}
- Empresa: ${profile.company}
- Cargo: ${profile.salesRole}
- Experiência: ${profile.experience}
- Principal dificuldade: ${profile.mainDifficulty}
- Objetivo no treinamento: ${profile.goal}
- Dia de prática (uso contínuo, sem prazo fixo): ${trainingDay || 1}

FORMATO DESTE ATENDIMENTO: ${mediumLabel(medium)}
${
  medium === "texto"
    ? "Avalie como conversa escrita: NÃO cobre tom de voz, ritmo de fala ou escuta ativa por áudio. Considere clareza e objetividade das mensagens, tempo/ordem das respostas, uso de perguntas no texto, e se ele conduziu ao próximo passo por escrito. Mensagem longa demais, vários assuntos numa tacada ou responder só o que perguntaram sem conduzir são falhas típicas deste formato."
    : "Avalie como conversa falada: considere condução, escuta, perguntas feitas na hora e como reagiu ao que ouviu."
}

OBSERVAÇÃO DO VENDEDOR SOBRE ESTE ATENDIMENTO
${observation.trim() || "(nenhuma)"}

TRANSCRIÇÃO DO ATENDIMENTO
"""
${transcript}
"""

Analise este atendimento e retorne o JSON no formato definido.`;
}
