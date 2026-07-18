// Adiciona à base de conhecimento (Firestore) um atendimento de REFERÊNCIA
// e o contexto do produto/processo da Simplifica, destilados da ligação da
// Ana Clara. Idempotente: não duplica se já existir (por título).
//
// Uso: node scripts/add-knowledge-good-call.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const ROOT = process.cwd();
const sa = JSON.parse(readFileSync(join(ROOT, "service-account.json"), "utf8"));
const app = initializeApp({
  credential: cert({
    projectId: sa.project_id,
    clientEmail: sa.client_email,
    privateKey: sa.private_key,
  }),
});
const db = getFirestore(app, "default");

const ENTRIES = [
  {
    title: "Atendimento de referência — o que é um bom atendimento (SDR agendando)",
    source: "Ligação Ana Clara → Gerson (11 min)",
    content:
      "Modelo de excelência para atendimento de qualificação/agendamento (SDR). Boas práticas observadas, que devem ser RECOMPENSADAS quando aparecerem e cobradas quando faltarem: " +
      "(1) Abertura que resgata o contexto do lead — retomar por que a pessoa chegou ('você preencheu nosso formulário e disse que queria melhorar sua performance através do vídeo do Thiago'), em vez de começar do zero. " +
      "(2) Pedir permissão antes de perguntar ('preciso te fazer 3 ou 4 perguntas, um minutinho, pode ser?') — reduz resistência e dá controle da condução. " +
      "(3) Diagnóstico com perguntas curtas e encadeadas: a performance é sua ou da equipe? qual segmento? como chegam os leads (indicação/tráfego)? quanto investe? vende mais por WhatsApp ou ligação? " +
      "(4) Espelhar e validar a dor com as palavras do cliente ('é na objeção, no contorno, né?', 'falta domínio?') — confirma o entendimento antes de propor. " +
      "(5) Fazer o cliente verbalizar a solução por conta própria ('como a gente gera necessidade?' → 'perguntando') — o cliente conclui, não o vendedor empurra. " +
      "(6) Gerar valor respondendo às dúvidas reais (prática acompanhada, ao vivo, suporte) em vez de despejar preço. " +
      "(7) Tratar preço com transparência de processo: o SDR não passa valor, direciona ao especialista ('essa parte dos valores quem passa é o nosso especialista') — sem soar evasivo. " +
      "(8) Rapport genuíno na objeção ('até eu faço igual aos meus clientes, querendo saber o preço primeiro'). " +
      "(9) Fechar com próximo passo claro e, quando possível, QUENTE e imediato — transição direta para o especialista ('ele tem 20 minutos agora, pode ser? já te mando o link no WhatsApp'). Esse encadeamento sem intervalo é o auge da condução. " +
      "Use este atendimento como padrão-ouro: quanto mais o atendimento avaliado se aproximar destes movimentos (diagnóstico antes de solução, dor validada, próximo passo quente), maior a nota em Diagnóstico, Condução do próximo passo e Fechamento.",
  },
  {
    title: "Contexto do produto e do processo comercial da Simplifica",
    source: "Ligação Ana Clara → Gerson (11 min)",
    content:
      "Entenda O QUE a Simplifica vende para avaliar os atendimentos com precisão. " +
      "Produto: mentoria comercial AO VIVO com o Thiago — não é curso gravado nem script solto. O diferencial é a PRÁTICA ACOMPANHADA: a equipe da Simplifica liga para o cliente do mentorado, faz a venda/agendamento na prática, e o mentorado assiste e aplica depois. Há também um GRUPO DE SUPORTE no WhatsApp, supervisionado durante o horário comercial, para ajudar em dificuldades do dia a dia. " +
      "Processo comercial em dois passos: (a) SDR/executiva qualifica e AGENDA a reunião; (b) o ESPECIALISTA (closer) conduz a reunião, apresenta a proposta de valor e passa o PREÇO. Por isso, num atendimento de SDR, NÃO passar o valor e direcionar ao especialista é correto — não deve ser penalizado como fuga. " +
      "Público-alvo: vendedores que já vendem, mas travam na negociação, na condução e no tratamento de objeções (ex.: 'vou pensar', 'está caro', consumidor final que não entende que precisa investir). " +
      "Ao analisar: reconheça quando o vendedor está no papel de SDR (qualificar e agendar) vs. closer (fechar e negociar preço) e calibre a expectativa de cada critério conforme o papel.",
  },
];

async function main() {
  const existing = await db.collection("knowledge").get();
  const titles = new Set(existing.docs.map((d) => (d.get("title") || "").trim()));
  let maxOrder = 0;
  existing.docs.forEach((d) => {
    maxOrder = Math.max(maxOrder, d.get("order") ?? 0);
  });

  let added = 0;
  for (const e of ENTRIES) {
    if (titles.has(e.title.trim())) {
      console.log("já existe, pulando:", e.title);
      continue;
    }
    maxOrder += 1;
    await db.collection("knowledge").add({
      title: e.title,
      source: e.source,
      content: e.content,
      order: maxOrder,
      enabled: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log("adicionado:", e.title);
    added += 1;
  }

  const all = await db.collection("knowledge").get();
  const chars = all.docs
    .filter((d) => d.get("enabled") !== false)
    .reduce((s, d) => s + (d.get("content") || "").length, 0);
  console.log(`\n${added} entrada(s) nova(s). Base agora: ${all.size} itens, ${(chars / 1000).toFixed(1)} mil caracteres.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
