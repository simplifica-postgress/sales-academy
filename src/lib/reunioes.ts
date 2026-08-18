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
  | "diagnostico"
  | "escuta"
  | "solucao"
  | "valor"
  | "objecoes"
  | "conducao"
  | "fechamento";

export const CRITERIOS_REUNIAO: {
  key: CriterioReuniao;
  label: string;
  peso: number;
  ajuda: string;
}[] = [
  { key: "abertura",   label: "Abertura e contexto",      peso: 8,  ajuda: "Quebrou o gelo, alinhou objetivo e tempo da reunião." },
  { key: "diagnostico", label: "Diagnóstico do cenário",  peso: 20, ajuda: "Entendeu o problema, o processo atual e o impacto antes de propor." },
  { key: "escuta",     label: "Escuta e perguntas",       peso: 12, ajuda: "Deixou o cliente falar, aprofundou o que ele disse, não atropelou." },
  { key: "solucao",    label: "Solução conectada à dor",  peso: 15, ajuda: "Apresentou o que resolve o problema DELE, não um catálogo." },
  { key: "valor",      label: "Geração de valor e prova", peso: 15, ajuda: "Mostrou retorno, números, casos — justificou o investimento." },
  { key: "objecoes",   label: "Tratamento de objeções",   peso: 12, ajuda: "Investigou a objeção real em vez de só rebater." },
  { key: "conducao",   label: "Condução da reunião",      peso: 8,  ajuda: "Manteve o controle, o ritmo e o foco no objetivo." },
  { key: "fechamento", label: "Fechamento e próximo passo", peso: 10, ajuda: "Pediu a decisão e saiu com data e compromisso definidos." },
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

/** Instruções do avaliador. */
export function promptSistema(conhecimento = ""): string {
  const lista = CRITERIOS_REUNIAO.map(
    (c) => `- ${c.label} (peso ${c.peso}): ${c.ajuda}`
  ).join("\n");

  return `Você é um head comercial sênior da Simplifica avaliando a gravação de uma REUNIÃO DE VENDAS do próprio time. O objetivo do time é fechar mais clientes, e esta análise é interna — pode ser direta, sem diplomacia.

Avalie por estes critérios e pesos (somam 100):
${lista}

${conhecimento}

Como avaliar:
- Reunião não é atendimento: aqui o que decide é ter DIAGNOSTICADO antes de propor, gerado valor e saído com um próximo passo firmado. Uma reunião simpática que termina em "vou pensar e te falo" é uma reunião fraca, por mais agradável que tenha sido.
- Cite trechos concretos. Feedback genérico não serve para nada.
- Aponte o que o cliente entregou de graça e o vendedor não aproveitou: sinais de urgência, orçamento, insatisfação com o fornecedor atual, menção a prazo ou a quem decide.
- Em "momentoDecisivo", aponte o instante exato em que a reunião virou — e explique por quê.
- Notas calibradas: 85+ excelente, 70-84 boa, 50-69 mediana, abaixo de 50 fraca. Não distribua notas altas por educação.
- "probabilidadeFechamento" reflete como a reunião TERMINOU, não a simpatia do cliente. Sem próximo passo com data, dificilmente é "alta".
- Em "proximaAcao", uma ação só, concreta, que dê para executar na próxima reunião.
- Escreva em português do Brasil, tratando o vendedor por "você".
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
