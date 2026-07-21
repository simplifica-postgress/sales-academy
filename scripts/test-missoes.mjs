// Verifica se a PRÓXIMA MISSÃO realmente varia conforme o atendimento.
//
// O problema que motivou este teste: o prompt trazia um único exemplo
// ("faça pelo menos 3 perguntas de diagnóstico...") e a IA passava a copiá-lo
// em quase toda análise — inclusive em atendimentos onde o diagnóstico tinha
// ido bem. Missão repetida não ensina nada.
//
// Uso: node scripts/test-missoes.mjs
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

// Quatro atendimentos com pontos fracos DIFERENTES de propósito.
const CASOS = [
  {
    nome: "Diagnostico bom, FECHAMENTO fraco",
    esperado: ["proximoPasso", "fechamento", "objecoes"],
    t: `Vendedor: Oi Marcos, aqui e o Bruno da Simplifica. Voce preencheu nosso formulario, certo? Cliente: Isso. Vendedor: Deixa eu entender seu cenario. Quantos vendedores voce tem? Cliente: Seis. Vendedor: E como chegam os leads hoje? Cliente: Trafego pago e indicacao. Vendedor: Quanto voce investe por mes em trafego? Cliente: Uns oito mil. Vendedor: E de cada dez oportunidades, quantas fecham? Cliente: Umas duas. Vendedor: Entao sao oito perdidas a cada dez. Onde voce sente que elas escapam? Cliente: Quando fala de preco o cara some. Vendedor: E quanto vale em media uma venda dessas? Cliente: Uns tres mil. Vendedor: Entao sao uns vinte e quatro mil por mes escapando so nessa etapa. Cliente: Nossa, colocando assim assusta. Vendedor: Pois e. A gente trabalha exatamente essa etapa, com mentoria ao vivo, o Thiago liga junto com o seu time. Cliente: Interessante. Vendedor: Legal. Entao ta bom, qualquer coisa a gente se fala, taa? Cliente: Ta, valeu. Vendedor: Abraco.`,
  },
  {
    nome: "Tudo ok, mas ABERTURA pessima",
    esperado: ["abertura", "clareza"],
    t: `Vendedor: Alo. Cliente: Alo, quem fala? Vendedor: E sobre vendas. Cliente: Como assim? Vendedor: Voce quer vender mais ou nao? Cliente: Peraí, de onde voce e? Vendedor: Simplifica. Enfim, me fala uma coisa, quantos vendedores voce tem? Cliente: Tenho quatro, mas... Vendedor: E qual a maior dificuldade deles hoje? Cliente: Fechar. Eles conversam bem mas nao fecham. Vendedor: Entendi. E isso acontece mais em qual etapa? Cliente: Depois que passa o valor. Vendedor: Certo. E quanto voce perde por mes com isso? Cliente: Sei la, uns dez mil. Vendedor: Entao olha, faz sentido a gente conversar. A nossa mentoria trabalha justamente a conducao depois do preco, com pratica ao vivo. Voce topa uma conversa de vinte minutos com nosso especialista amanha as dez? Cliente: Pode ser. Vendedor: Fechado, mando o link no WhatsApp e te confirmo amanha cedo. Cliente: Combinado.`,
  },
  {
    nome: "Diagnostico ok, some na OBJECAO de preco",
    esperado: ["objecoes", "valor"],
    t: `Vendedor: Oi Carla, Bruno da Simplifica. Voce pediu informacao sobre treinamento comercial. Cliente: Isso mesmo. Vendedor: Me conta, como e sua operacao hoje? Cliente: Tenho tres vendedoras, vendo estetica. Vendedor: E o que te incomoda mais? Cliente: Elas atendem bem mas o cliente pede pra pensar e some. Vendedor: Quantas oportunidades por semana? Cliente: Umas trinta. Vendedor: E fecham quantas? Cliente: Cinco, seis. Vendedor: Entendi, tem espaco. Nossa mentoria trabalha exatamente isso, ao vivo, com acompanhamento. O investimento e mil e novecentos por mes. Cliente: Nossa, e caro. Vendedor: Entendo. Cliente: Muito acima do que eu imaginava. Vendedor: Sei como e. Cliente: Vou ter que pensar entao. Vendedor: Sem problema, fico a disposicao. Cliente: Obrigada. Vendedor: De nada, tchau.`,
  },
  {
    nome: "Excelente (o de referencia)",
    esperado: null, // qualquer critério, mas NÃO pode ser missão genérica de diagnóstico
    t: `Atendente: Oi, bom dia, tudo bem? Cliente: Quem fala? Atendente: Aqui e a Ana Clara, executiva da Simplifica. Voce preencheu nosso formulario e falou que gostaria de melhorar sua performance em vendas. Preciso te fazer tres ou quatro perguntas, coisa de um minutinho, pode ser? Cliente: Pode. Atendente: A performance que voce quer melhorar e sua ou da equipe? Cliente: Minha. Atendente: Trabalha com qual segmento? Cliente: Seguros. Atendente: Pelo que entendi voce ja sabe vender mas quer conduzir melhor, e na objecao que trava? Cliente: Falta dominio, e isso. Atendente: O consumidor as vezes nao entende que precisa investir. Cliente: Isso, acha caro e some. Atendente: E como a gente gera necessidade? Cliente: Perguntando. Atendente: Exatamente. Como chegam seus leads, indicacao, trafego? Cliente: De tudo. Atendente: Quanto investe? Cliente: Entre 250 e 500. Atendente: Na nossa mentoria a gente entra junto, ao vivo: o Thiago liga pro seu cliente e voce assiste e aplica. Tem grupo de suporte no horario comercial. Cliente: E o valor? Atendente: Essa parte quem passa e o especialista, que entende seu caso e monta o encaixe. Acabei de ver que ele tem vinte minutos agora, pode ser? Cliente: Pode. Atendente: Perfeito, mando o link no WhatsApp, ja passei seu contexto pra ele.`,
  },
];

async function token() {
  const uid = (await getAuth(app).getUserByEmail("thiagobrito1018@gmail.com")).uid;
  const ct = await getAuth(app).createCustomToken(uid);
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: ct, returnSecureToken: true }) }
  ).then((x) => x.json());
  return r.idToken;
}

/** Frase "molde" que a IA repetia em quase toda análise. */
const GENERICA = /fa[çc]a (obrigatoriamente )?pelo menos \d+ perguntas? de diagn[óo]stico/i;

async function main() {
  const tk = await token();
  const missoes = [];
  let alertas = 0;

  for (const c of CASOS) {
    const r = await fetch(`${BASE}/api/admin/test-analysis`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tk}`, "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: c.t, sellerName: "Bruno", mainDifficulty: "conduzir ate o fechamento" }),
    }).then((x) => x.json());

    const foco = r.result?.missionFocus ?? "(sem foco)";
    const missao = (r.result?.nextMission ?? "").trim();
    const notas = r.result?.criteriaScores ?? {};
    const pior = Object.entries(notas).sort((a, b) => a[1] - b[1])[0];

    console.log(`\n${c.nome}`);
    console.log(`  nota ${r.generalScore} | pior criterio: ${pior?.[0]} (${pior?.[1]}) | foco declarado: ${foco}`);
    console.log(`  missao: ${missao}`);

    if (GENERICA.test(missao)) {
      console.log(`  >> ALERTA: caiu na formula generica de diagnostico`);
      alertas += 1;
    }
    if (c.esperado && !c.esperado.includes(foco)) {
      console.log(`  >> ATENCAO: foco esperado era um de [${c.esperado.join(", ")}]`);
    }
    missoes.push(missao);
  }

  // Quão parecidas são entre si? Compara palavras em comum.
  const palavras = (s) => new Set(s.toLowerCase().replace(/[^\wáéíóúâêôãõç ]/g, "").split(/\s+/).filter((w) => w.length > 4));
  let maiorSobreposicao = 0;
  for (let i = 0; i < missoes.length; i++) {
    for (let j = i + 1; j < missoes.length; j++) {
      const a = palavras(missoes[i]);
      const b = palavras(missoes[j]);
      const comum = [...a].filter((w) => b.has(w)).length;
      const pct = Math.round((comum / Math.min(a.size, b.size)) * 100);
      maiorSobreposicao = Math.max(maiorSobreposicao, pct);
    }
  }

  console.log(`\n=== VEREDITO ===`);
  console.log(`  Missoes na formula generica: ${alertas}/${CASOS.length}`);
  console.log(`  Maior sobreposicao de palavras entre duas missoes: ${maiorSobreposicao}%`);
  console.log(`  Alvo: 0 genericas e sobreposicao abaixo de 50%.`);
  process.exit(alertas > 0 || maiorSobreposicao >= 50 ? 1 : 0);
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
