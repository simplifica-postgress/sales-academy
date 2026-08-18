import type { Timestamp } from "firebase/firestore";

/**
 * Ferramenta INTERNA de análise de reuniões comerciais.
 *
 * Separada do Sales Academy de propósito: lá o objetivo é treinar o
 * atendimento (prospecção, WhatsApp, ligação); aqui o objetivo é FECHAR —
 * a régua é a reunião de venda, com diagnóstico, proposta e próximo passo.
 * Por isso os critérios e os pesos são outros.
 */

export type CriterioReuniao =
  | "abertura"
  | "mapeamento"
  | "expectativas"
  | "metodologia"
  | "ancoragem"
  | "provaSocial"
  | "objecoes"
  | "fechamento";

export const CRITERIOS_REUNIAO: {
  key: CriterioReuniao;
  label: string;
  peso: number;
  ajuda: string;
}[] = [
  {
    key: "abertura",
    label: "Apresentação e autoridade",
    peso: 8,
    ajuda:
      "Etapas 1 e 2: apresentou-se, apresentou a Simplifica (25 estados, 500+ empresas) e a promessa dos 42 dias.",
  },
  {
    key: "mapeamento",
    label: "Mapeamento com números",
    peso: 22,
    ajuda:
      "Etapa 3: tempo de mercado, tamanho da equipe, faturamento atual e recorde, ticket médio, vendas/mês, meta do ano e como vende hoje.",
  },
  {
    key: "expectativas",
    label: "Alinhamento de expectativas",
    peso: 8,
    ajuda: "Etapa 4: deixou claro o objetivo da reunião e combinou como ela seria conduzida.",
  },
  {
    key: "metodologia",
    label: "Apresentação da metodologia",
    peso: 12,
    ajuda: "Etapas 5 a 8: BASE, TRAÇÃO, MATURAÇÃO e ESCALA, e o problema que o método resolve.",
  },
  {
    key: "ancoragem",
    label: "Ancoragem e geração de valor",
    peso: 12,
    ajuda:
      "Etapa 6/7: comparou com o custo do time interno (R$ 27.466) e ligou o investimento aos NÚMEROS que o lead deu.",
  },
  {
    key: "provaSocial",
    label: "Prova social",
    peso: 10,
    ajuda: "Etapa 8/9: cases específicos, com números e prazo, e não elogio genérico.",
  },
  {
    key: "objecoes",
    label: "Tratamento de objeções",
    peso: 14,
    ajuda:
      "Etapas 11 e 12: investigou a objeção real (preço, sócio, 'faço sozinho') em vez de só rebater.",
  },
  {
    key: "fechamento",
    label: "Fechamento e próximo passo",
    peso: 14,
    ajuda:
      "Pediu a decisão, e saiu com compromisso: data definida, grupo, indicações. 'Depois te falo' não é fechamento.",
  },
];

export type NotasReuniao = Record<CriterioReuniao, number>;

/** Média ponderada (0–100). A nota é calculada aqui, nunca vem da IA. */
export function notaGeral(notas: Partial<NotasReuniao>): number {
  const total = CRITERIOS_REUNIAO.reduce(
    (soma, c) => soma + (notas[c.key] ?? 0) * c.peso,
    0
  );
  return Math.round(total / 100);
}

/** Como o resultado é lido de relance. */
export function faixa(nota: number): { rotulo: string; tom: "bom" | "medio" | "ruim" } {
  if (nota >= 80) return { rotulo: "Reunião forte", tom: "bom" };
  if (nota >= 60) return { rotulo: "Deu para avançar", tom: "medio" };
  return { rotulo: "Precisa melhorar", tom: "ruim" };
}

export type ResultadoReuniao = {
  resumo: string;
  momentoDecisivo: string;
  acertos: string[];
  erros: string[];
  perdidas: string[];
  notas: NotasReuniao;
  focoDaProxima: CriterioReuniao;
  proximaAcao: string;
  probabilidadeFechamento: "alta" | "media" | "baixa";
};

export interface AnaliseReuniao extends ResultadoReuniao {
  titulo: string;
  participantes: string;
  contexto: string;
  transcricao: string;
  notaGeral: number;
  origem: "arquivo" | "texto";
  criadoEm: Timestamp;
}

/** Formato fixo que a IA deve devolver. */
export const ESQUEMA_REUNIAO = {
  name: "analise_reuniao",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      resumo: { type: "string", description: "O que aconteceu na reunião, em 3-4 frases diretas." },
      momentoDecisivo: {
        type: "string",
        description:
          "O instante que mais mexeu no rumo da reunião (para bem ou para mal), citando o que foi dito ali.",
      },
      acertos: { type: "array", items: { type: "string" }, description: "O que funcionou, com o trecho que prova." },
      erros: { type: "array", items: { type: "string" }, description: "O que atrapalhou o fechamento." },
      perdidas: {
        type: "array",
        items: { type: "string" },
        description: "Oportunidades que passaram: perguntas que caberiam, ganchos que o cliente deu e não foram explorados.",
      },
      notas: {
        type: "object",
        additionalProperties: false,
        properties: Object.fromEntries(
          CRITERIOS_REUNIAO.map((c) => [
            c.key,
            { type: "integer", minimum: 0, maximum: 100, description: `${c.label} (0-100). ${c.ajuda}` },
          ])
        ),
        required: CRITERIOS_REUNIAO.map((c) => c.key),
      },
      focoDaProxima: {
        type: "string",
        enum: CRITERIOS_REUNIAO.map((c) => c.key),
        description: "Critério de MENOR nota. É o que a próxima reunião deve atacar.",
      },
      proximaAcao: {
        type: "string",
        description:
          "UMA ação concreta para a próxima reunião, ligada ao critério de focoDaProxima e citando algo desta reunião.",
      },
      probabilidadeFechamento: {
        type: "string",
        enum: ["alta", "media", "baixa"],
        description: "Chance real de fechar, com base em como a reunião terminou.",
      },
    },
    required: [
      "resumo", "momentoDecisivo", "acertos", "erros", "perdidas",
      "notas", "focoDaProxima", "proximaAcao", "probabilidadeFechamento",
    ],
  },
} as const;

/**
 * Instruções do avaliador.
 *
 * O `guia` aqui é SEMPRE o script de reunião da Simplifica — nunca a base
 * do Sales Academy. Ver src/lib/server/reunioesGuia.ts.
 */
export function promptSistema(guia = ""): string {
  const lista = CRITERIOS_REUNIAO.map(
    (c) => `- ${c.label} (peso ${c.peso}): ${c.ajuda}`
  ).join("\n");

  return `Você é o head comercial da Simplifica avaliando a gravação de uma REUNIÃO DE VENDAS do próprio time. O objetivo é fechar mais clientes, e a análise é interna — seja direto, sem diplomacia.

Avalie por estes critérios e pesos (somam 100):
${lista}

${guia}

Como avaliar:
- A régua é o SCRIPT ACIMA. Aponte o que o vendedor cumpriu, o que pulou e o que fez fora de ordem, citando a etapa pelo nome ("Etapa 3 — Mapeamento").
- O MAPEAMENTO é o que mais pesa, e é objetivo: verifique um a um se ele levantou tempo de mercado, tamanho da equipe, faturamento atual, faturamento recorde, ticket médio, vendas por mês, meta do ano e como vende hoje. Diga quais faltaram. Sem esses números não há ancoragem possível depois.
- Reunião não é atendimento: aqui o que decide é diagnosticar antes de propor, ancorar valor nos números do próprio lead e sair com compromisso. Reunião simpática que termina em "vou pensar e te falo" é reunião fraca.
- Cite trechos concretos. Feedback genérico não serve para nada.
- Aponte o que o cliente entregou de graça e o vendedor não aproveitou: sinal de urgência, orçamento, insatisfação com fornecedor atual, prazo, quem decide.
- Em "momentoDecisivo", aponte o instante exato em que a reunião virou — e por quê.
- Notas calibradas: 85+ excelente, 70-84 boa, 50-69 mediana, abaixo de 50 fraca. Não distribua nota alta por educação.
- "probabilidadeFechamento" reflete como a reunião TERMINOU, não a simpatia do cliente. Sem próximo passo com data, dificilmente é "alta".
- Em "proximaAcao", uma ação só, concreta, executável na próxima reunião.
- Português do Brasil, tratando o vendedor por "você".
- Responda APENAS no formato JSON pedido.`;
}

export function promptUsuario(
  titulo: string,
  participantes: string,
  contexto: string,
  transcricao: string
): string {
  return `REUNIÃO
- Título: ${titulo || "(sem título)"}
- Quem participou: ${participantes || "(não informado)"}

CONTEXTO INFORMADO PELO TIME
${contexto.trim() || "(nenhum)"}

TRANSCRIÇÃO
"""
${transcricao}
"""

Avalie esta reunião e devolva o JSON no formato definido.`;
}
