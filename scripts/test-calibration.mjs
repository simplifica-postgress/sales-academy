// Testa a CALIBRAÇÃO da IA: roda a mesma análise em um atendimento BOM
// (Ana Clara → Gerson) e num RUIM (curto/telemarketing), e mostra as notas.
// O bom precisa pontuar alto; o ruim, baixo. Uso: node scripts/test-calibration.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const env = {};
for (const l of readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const sa = JSON.parse(readFileSync(join(process.cwd(), "service-account.json"), "utf8"));
const app = initializeApp({
  credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }),
});
const BASE = process.env.BASE || "http://localhost:3000";

const BOM = `Atendente: Oi, bom dia, tudo bem? Cliente: Quem fala? Atendente: Aqui é a Ana Clara, executiva da Simplifica. Está lembrado da gente? Você preencheu nosso formulário e falou que gostaria de melhorar sua performance em vendas através de um vídeo do Thiago. Cliente: Ah, é aquela empresa que fica fazendo ligação? Atendente: Exatamente. Estou te ligando só para entender como você quer melhorar e em qual aspecto, pra saber se ele consegue te ajudar. Preciso te fazer três ou quatro perguntas, coisa de um minutinho, pode ser? Cliente: Pode ser. Atendente: A performance em vendas que você quer melhorar é sua ou da sua equipe? Cliente: É minha. Atendente: Hoje você trabalha com vendas de qual segmento? Cliente: Seguro. Atendente: Ótimo, já temos empresas desse segmento. Pelo que entendi, você busca melhorar na negociação, você já sabe vender mas quer conduzir melhor, certo? Cliente: É, a conversa vai fluindo, mas na hora de avançar eu me perco com o cliente. Atendente: É na objeção, no contorno, né? Falta um pouco de domínio? Cliente: Falta domínio, eu não domino essa parte. Atendente: Entendi. O consumidor final às vezes não entende que precisa investir. Cliente: Isso, ele acha caro, acha que não precisa e vem com desculpas. Atendente: Essa é uma dor grande do mercado. O ideal é gerar uma necessidade real. E como a gente gera essa necessidade? Cliente: Perguntando. Atendente: Perguntando. Já que entendi sua dificuldade, vamos marcar uma conversa rápida, só pra entender mais a fundo, e independente de fechar você já sai com dicas pra aplicar. Como chegam os leads pra você hoje, indicação, tráfego? Cliente: De tudo, indicação, tráfego. Atendente: Você já tem gestão de tráfego? Quanto investe em média? Cliente: Entre 250 e 500. Atendente: E como faz a venda, WhatsApp, ligação? Cliente: Às vezes ligação, às vezes o cliente já chega pela mídia. Atendente: No nosso caso a gente não entrega só script e curso. A gente entra junto na mentoria, ao vivo com o Thiago: ele liga pro seu cliente, faz a venda ou o agendamento, e você assiste e aplica. Tem também um grupo no WhatsApp supervisionado no horário comercial pra te ajudar nas dificuldades do dia. Cliente: Ao vivo com o Thiago? Então posso falar da minha dificuldade específica? Atendente: Exatamente, é a sua dificuldade. Cliente: Mas você não tem uma noção de valor? Atendente: Essa parte dos valores quem te passa é o nosso especialista, ele conversa com você, passa dicas e entende o que encaixa melhor. Cliente: Entendi, até eu faço igual, querendo saber o preço primeiro. Atendente: Acabei de verificar com o especialista, ele tem vinte minutos agora, pode ser? Cliente: Pode ser, agora. Atendente: Perfeito, vou te mandar o link no WhatsApp e você já entra. Já passei suas informações pra ele, ele escutou a conversa e vai te ajudar bastante. Cliente: Obrigado. Atendente: Valeu, até daqui a pouco.`;

const RUIM = `Vendedor: Oi bom dia, aqui é o Thiago da Simplifica. Recebi seu contato. Hoje quantos vendedores você tem no time? Cliente: Quatro. Vendedor: E qual o maior gargalo de vocês nas vendas? Cliente: A gente perde no fechamento. Vendedor: A gente tem um método que resolve exatamente isso. O investimento é de dois mil reais por mês. O que você acha, fechamos? Cliente: Vou pensar. Vendedor: Ok, qualquer coisa me chama.`;

// O caso que mais importa: o atendimento MEDIANO, que é o que a maioria dos
// vendedores faz de verdade. Educado, faz algumas perguntas, mas não aprofunda
// a dor, não quantifica impacto, apresenta solução cedo e fecha com "te mando
// por WhatsApp" em vez de próximo passo agendado. NÃO deve tirar nota alta.
const MEDIANO = `Vendedor: Oi, boa tarde, aqui é o Rafael da Simplifica, tudo bem? Cliente: Tudo, e você? Vendedor: Tudo ótimo. Vi aqui que você preencheu nosso formulário sobre treinamento comercial, é isso mesmo? Cliente: Isso, eu vi um vídeo de vocês e me interessei. Vendedor: Que bom. Deixa eu te perguntar, você trabalha com o quê hoje? Cliente: Tenho uma empresa de material de construção, vendo pra construtora e pra consumidor final. Vendedor: Legal. E vocês têm equipe de vendas? Cliente: Tenho três vendedores comigo. Vendedor: Entendi. E como está a performance deles hoje? Cliente: Olha, poderia ser melhor. Eles atendem bem, mas não fecham tanto quanto eu queria. Vendedor: Sei como é, isso é bem comum. E você acha que é falta de técnica ou falta de vontade? Cliente: Acho que é técnica mesmo, eles são esforçados. Vendedor: Perfeito, então o nosso treinamento encaixa bem. A gente trabalha justamente a parte de condução e fechamento, tem mentoria ao vivo, tem material, tem acompanhamento. É bem completo, viu. Cliente: Ah, entendi. E como funciona, é online? Vendedor: É online, sim, e tem encontro ao vivo toda semana. A galera gosta bastante, tem tido bastante resultado. Cliente: Legal. E o valor? Vendedor: Então, o valor a gente vê depois conforme o plano, tem algumas opções. Mas ó, eu vou te mandar tudo certinho no WhatsApp, aí você olha com calma e me fala o que achou, pode ser? Cliente: Pode ser, me manda lá. Vendedor: Fechado, te mando ainda hoje. Obrigado, viu, boa tarde. Cliente: Boa tarde.`;

async function adminToken() {
  const uid = (await getAuth(app).getUserByEmail("thiagobrito1018@gmail.com")).uid;
  const ct = await getAuth(app).createCustomToken(uid);
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: ct, returnSecureToken: true }) }
  ).then((x) => x.json());
  return r.idToken;
}

async function analyze(token, transcript, sellerName, dificuldade) {
  const r = await fetch(`${BASE}/api/admin/test-analysis`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ transcript, sellerName, mainDifficulty: dificuldade }),
  }).then((x) => x.json());
  return r;
}

async function main() {
  const token = await adminToken();

  console.log("Analisando ATENDIMENTO BOM (Ana Clara)...");
  const bom = await analyze(token, BOM, "Ana Clara", "conduzir a negociação e tratar objeções");
  console.log("  Nota geral:", bom.generalScore);
  console.log("  Criterios:", JSON.stringify(bom.result?.criteriaScores));

  console.log("\nAnalisando ATENDIMENTO MEDIANO (Rafael)...");
  const medio = await analyze(token, MEDIANO, "Rafael", "fechar mais e conduzir melhor");
  console.log("  Nota geral:", medio.generalScore);
  console.log("  Criterios:", JSON.stringify(medio.result?.criteriaScores));

  console.log("\nAnalisando ATENDIMENTO RUIM (curto)...");
  const ruim = await analyze(token, RUIM, "Thiago", "leads somem depois do preço");
  console.log("  Nota geral:", ruim.generalScore);
  console.log("  Criterios:", JSON.stringify(ruim.result?.criteriaScores));

  console.log("\n=== VEREDITO ===");
  console.log(`  Bom: ${bom.generalScore} | Mediano: ${medio.generalScore} | Ruim: ${ruim.generalScore}`);
  console.log(`  O mediano precisa ficar na faixa 50-69 (regular). Acima de 70 = leniente.`);
  process.exit(0);
}

main().catch((e) => { console.error("ERRO:", e); process.exit(1); });
