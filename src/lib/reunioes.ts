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
  | "conexao"
  | "autoridade"
  | "diagnostico"
  | "validacao"
  | "apresentacao"
  | "valor"
  | "negociacao"
  | "objecoes"
  | "fechamento";

/**
 * Critérios = as FASES do guia de reunião, não as frases dele.
 *
 * O guia é editável pela página; se os critérios citassem números ou nomes
 * específicos do script (como os antigos citavam "R$ 27.466"), eles ficariam
 * mentindo na primeira edição. Por isso cada critério descreve o que a fase
 * pede, e a IA confere o detalhe no guia em vigor.
 */
export const CRITERIOS_REUNIAO: {
  key: CriterioReuniao;
  label: string;
  peso: number;
  ajuda: string;
}[] = [
  {
    key: "conexao",
    label: "Conexão e rapport",
    peso: 8,
    ajuda: "Conexão imediata, rapport fora do assunto de venda, leitura do perfil do cliente e condução espelhada a ele.",
  },
  {
    key: "autoridade",
    label: "Abertura e autoridade",
    peso: 8,
    ajuda: "Assumiu a condução, apresentou-se e explicou objetivo e funcionamento da reunião, tirando a pressão de venda.",
  },
  {
    key: "diagnostico",
    label: "Diagnóstico",
    peso: 22,
    ajuda: "Perguntou em vez de afirmar — situação, problema, impacto e necessidade — e levantou os números do negócio.",
  },
  {
    key: "validacao",
    label: "Devolução da dor",
    peso: 8,
    ajuda: "Antes de apresentar, devolveu os pontos que ouviu e fez o cliente confirmar a leitura.",
  },
  {
    key: "apresentacao",
    label: "Método e números",
    peso: 16,
    ajuda: "Apresentou o método ligado à dor encontrada e montou a conta com os números reais do cliente, mostrando o gargalo.",
  },
  {
    key: "valor",
    label: "Ancoragem e prova",
    peso: 8,
    ajuda: "Ancorou o valor e usou depoimentos escolhidos para aquele cliente, não genéricos.",
  },
  {
    key: "negociacao",
    label: "Alinhamento para negociar",
    peso: 10,
    ajuda: "Antes do preço, confirmou que a proposta resolve o problema e combinou um sim ou não na reunião.",
  },
  {
    key: "objecoes",
    label: "Tratamento de objeções",
    peso: 10,
    ajuda: "Acolheu a objeção, descobriu a real, isolou (é só esse fator?) e criou compromisso antes de ceder.",
  },
  {
    key: "fechamento",
    label: "Fechamento",
    peso: 10,
    ajuda: "Fez a oferta, pediu a decisão e o compromisso na própria reunião e pediu indicação. 'Depois te falo' não é fechamento.",
  },
];

/** Retrato dos critérios gravado junto de cada análise. */
export type CriterioSalvo = { key: string; label: string; peso: number };

export function retratoCriterios(): CriterioSalvo[] {
  return CRITERIOS_REUNIAO.map(({ key, label, peso }) => ({ key, label, peso }));
}

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
 * O `guia` aqui é SEMPRE o guia de reunião da Simplifica — nunca a base do
 * Sales Academy. Ver src/lib/server/reunioesGuia.ts.
 */
export function promptSistema(guia = ""): string {
  const lista = CRITERIOS_REUNIAO.map(
    (c) => `- ${c.label} (peso ${c.peso}): ${c.ajuda}`
  ).join("\n");

  return `Você é o head comercial da Simplifica avaliando a gravação de uma REUNIÃO DE FECHAMENTO do próprio time. O objetivo é fechar mais clientes, e a análise é interna — seja direto, sem diplomacia.

Avalie por estes critérios e pesos (somam 100). Cada critério é uma FASE do guia abaixo: o detalhe do que a fase exige está no guia, e é contra ele que você julga.
${lista}

${guia}

Como avaliar:
- A régua é o GUIA ACIMA. Aponte o que o vendedor cumpriu, o que pulou e o que fez fora de ordem, citando a etapa com o nome que o guia usa.
- O DIAGNÓSTICO é o que mais pesa. Verifique se ele PERGUNTOU em vez de afirmar, se cobriu situação, problema, impacto e necessidade, e quais números do negócio levantou ou deixou de levantar. Sem números não há conta para mostrar depois.
- Confira se a dor foi devolvida e validada pelo cliente ANTES da apresentação, e se a apresentação usou os números reais dele para mostrar onde está o gargalo.
- Reunião simpática que termina em "vou pensar e te falo" é reunião fraca. O que decide é diagnosticar antes de propor, mostrar a conta e sair com compromisso.
- Cite trechos concretos, com o minuto quando a transcrição trouxer. Feedback genérico não serve para nada.
- Aponte o que o cliente entregou de graça e o vendedor não aproveitou: urgência, orçamento, insatisfação com o fornecedor atual, prazo, quem decide.
- Em "momentoDecisivo", aponte o instante exato em que a reunião virou — e por quê.
- Notas calibradas: 85+ excelente, 70-84 boa, 50-69 mediana, abaixo de 50 fraca. Não distribua nota alta por educação.
- Critério cuja fase não chegou a acontecer (por exemplo, não houve objeção) é avaliado pelo que deveria ter acontecido ali, sem inventar.
- "probabilidadeFechamento" reflete como a reunião TERMINOU, não a simpatia do cliente. Sem compromisso ou data, dificilmente é "alta".
- Em "proximaAcao", uma ação só, concreta, executável na próxima reunião.
- Português do Brasil, tratando o vendedor por "você".
- Texto puro, sem markdown: nada de **, # ou listas dentro dos campos (a tela mostra o texto como está).
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
