/**
 * Base de conhecimento comercial da Simplifica.
 *
 * Este material é injetado no prompt da IA (ver `analysis.ts`) para que a
 * análise dos atendimentos e as recomendações fiquem alinhadas ao método da
 * Simplifica — não a técnicas genéricas.
 *
 * ATENÇÃO: em produção a base viva fica no Firestore (coleção `knowledge`),
 * editável pelo painel do gestor. O array abaixo é a **carga inicial** (seed)
 * e o fallback caso a coleção esteja vazia. Ver `lib/server/knowledge.ts`.
 */

import { kindOf, numberPrinciples, type PrincipleEntry } from "./principles";

export interface KnowledgeEntry {
  /** Título curto da técnica/boa prática. */
  title: string;
  /** Fonte/timecode do material original (opcional). */
  source?: string;
  /** O aprendizado central e como aplicar. */
  content: string;
  /** Ordem de exibição/injeção (opcional). */
  order?: number;
}

export const SALES_KNOWLEDGE: KnowledgeEntry[] = [
  {
    title: "Entender o problema antes de orientar",
    source: "01:35–02:33",
    content:
      "Antes de oferecer solução, investigue o que está acontecendo e alinhe o significado de cada etapa. Uma venda só está concluída quando há contrato, sinal ou pagamento — não basta o cliente dizer que 'fechou'.",
  },
  {
    title: "Follow-up baseado no combinado",
    source: "04:30–05:00",
    content:
      "Não faça follow-up genérico. Resgate o compromisso assumido pelo cliente: 'Nós tínhamos combinado um retorno para hoje. O que mudou?'. Usar o acordo anterior gera responsabilidade sem cobrar de forma agressiva.",
  },
  {
    title: "Respeitar a decisão e combinar o próximo contato",
    source: "09:44–10:30",
    content:
      "Quando o cliente não quer fechar agora, respeite a decisão, mas defina uma data exata de retorno e peça o compromisso de que ele responderá — mesmo que seja para dizer não. Todo atendimento precisa terminar com um próximo passo claro. Ex.: 'Vou respeitar sua decisão de não avançar agora. Vamos combinar uma data para conversarmos novamente? Só peço que, nesse dia, você me dê um retorno, mesmo que seja para dizer que não deseja continuar.'",
  },
  {
    title: "Apresentar condições com transparência",
    source: "11:07–11:40",
    content:
      "Deixe claras as regras (ex.: determinada condição depende de sinal). Se o cliente não avança, pode retornar depois, mas sem garantia da mesma oferta. Apresente as condições com firmeza, explicando que fazem parte do processo da empresa — não é pressão.",
  },
  {
    title: "Retomar o que o próprio cliente falou",
    source: "14:13–16:41",
    content:
      "Recupere informações que o cliente deu no diagnóstico (objetivo, dificuldade, prejuízo, urgência) e questione a incoerência entre reconhecer o problema e sair sem decidir. Confronte a dúvida, não a pessoa, buscando a verdadeira objeção. Ex.: 'Você comentou que esse problema já afeta sua empresa há meses e concordou que a solução atende ao que precisa. O que ainda está impedindo você de avançar?'",
  },
  {
    title: "Ser agradável sem assumir postura passiva",
    source: "20:03–20:29",
    content:
      "Crie uma conversa leve sem parecer passivo ou perder a condução. Bom atendimento não é só ser simpático: é acolher o cliente mantendo direção, clareza e autoridade.",
  },
  {
    title: "Adaptar a comunicação ao perfil da pessoa",
    source: "20:50–24:51",
    content:
      "Cada perfil reage diferente à pressão, perguntas e negociação. Crie empatia rápido, observe como o cliente se comunica, seja mais direto com pessoas objetivas e mais cuidadoso com analíticas ou inseguras. A mensagem pode ser firme sem a comunicação parecer agressiva.",
  },
  {
    title: "Pedir autorização antes de entrar na negociação",
    source: "28:48–30:06",
    content:
      "Antes de apresentar condição especial, confirme se o cliente está preparado para negociar. Não ofereça desconto/condição sem confirmar a intenção real de compra. Ex.: 'Agora entramos na etapa de negociação. Antes de avançar, preciso entender: vocês estão preparados para analisar uma condição e tomar uma decisão agora?'",
  },
  {
    title: "Respeitar diferentes processos de decisão",
    source: "31:07–32:51",
    content:
      "Alguns perfis não podem ser pressionados; abordagem incisiva demais gera antipatia e perde a venda. Firmeza não é usar a mesma pressão com todos — o ritmo deve considerar o perfil do cliente.",
  },
  {
    title: "Utilizar dados para demonstrar valor",
    source: "32:59–35:36",
    content:
      "Com clientes analíticos, use os números que o próprio cliente forneceu: quanto perde hoje, quanto ganharia com uma melhoria e a diferença entre o investimento e o prejuízo do problema. Depois faça uma pergunta baseada nesses números, em vez de insistir na compra. Analíticos convencem-se por lógica, dados e provas, não só emoção.",
  },
  {
    title: "Personalizar a proposta antes da reunião",
    source: "36:53–39:09",
    content:
      "Adapte a proposta ao tamanho da empresa, número de vendedores, pessoas a treinar e esforço de entrega. Personalização não é chamar pelo nome — é mostrar que a solução foi estruturada para a realidade do cliente.",
  },
  {
    title: "Não apresentar muitas decisões ao mesmo tempo",
    source: "48:41–50:13",
    content:
      "Separe a apresentação em etapas: (1) validar se os entregáveis resolvem o problema; (2) obter aprovação da solução; (3) só então apresentar investimento e formas de pagamento. Mostrar solução, preço e várias opções de uma vez confunde e cria objeções desnecessárias.",
  },
  {
    title: "Exemplo de ligação para confirmação de agendamento",
    source: "80:35–80:58",
    content:
      "Na ligação: cumprimente pelo nome, apresente a empresa, relembre o agendamento, informe novamente dia e horário e confirme a participação. Ex.: 'Olá, [Nome], bom dia! Aqui é [Atendente], da [Empresa]. Você agendou uma reunião com a nossa equipe para sexta-feira, às 11h. Estou ligando para confirmar que está tudo certo para a sua participação.'",
  },
];

/**
 * Resumo do método (usado como fecho da base no prompt da IA).
 */
export const METHODOLOGY_SUMMARY =
  "O método defende um atendimento que combina empatia, personalização e firmeza. O vendedor deve ouvir, recuperar o que o cliente falou, adaptar a abordagem ao perfil comportamental, deixar próximos passos definidos e conduzir a decisão sem parecer agressivo. Falas muito incisivas não devem ser copiadas literalmente — o valor está na técnica: questionar com respeito, cobrar coerência, manter o controle da conversa e nunca deixar o atendimento sem uma definição clara.";

/**
 * Formata as entradas para injeção no prompt da IA.
 *
 * A numeração vem de `numberPrinciples` — a MESMA que o vendedor vê na seção
 * "Princípios e Casos". A IA é instruída (em analysis.ts) a citar número E
 * título, para a referência continuar compreensível mesmo se a lista mudar
 * depois que a análise foi gerada.
 */
export function formatKnowledge(
  entries: KnowledgeEntry[],
  summary = METHODOLOGY_SUMMARY
): string {
  const numbered = numberPrinciples(entries as PrincipleEntry[]);
  if (numbered.length === 0) return "";
  const items = numbered
    .map((k) => {
      const rotulo = kindOf(k) === "caso" ? "CASO" : "Princípio";
      return `${rotulo} ${k.number} — ${k.title}: ${k.content}`;
    })
    .join("\n");
  return `PRINCÍPIOS E CASOS DA SIMPLIFICA (referência oficial — avalie o atendimento e escreva as recomendações à luz deste material):\n${items}\n\nSíntese do método: ${summary}`;
}

/** Base versionada (seed/fallback) formatada para o prompt. */
export function knowledgeAsPrompt(): string {
  return formatKnowledge(SALES_KNOWLEDGE);
}
