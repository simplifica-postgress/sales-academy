// Confere a configuração do Stripe de ponta a ponta e diz o que falta.
//
// SOMENTE LEITURA: não cria, não altera e não cobra nada. E nunca imprime a
// chave secreta — só o suficiente para identificar o modo (test/live).
//
// Uso: node scripts/verificar-stripe.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import Stripe from "stripe";

const ROOT = process.cwd();

// ---------- .env.local ----------
let env = {};
try {
  const bruto = readFileSync(join(ROOT, ".env.local"), "utf8");
  for (const linha of bruto.split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2].trim();
  }
} catch {
  console.error("Não encontrei o .env.local na pasta do projeto.");
  process.exit(1);
}

const ok = (t) => console.log(`  [OK]    ${t}`);
const erro = (t) => console.log(`  [FALTA] ${t}`);
const aviso = (t) => console.log(`  [ATENÇÃO] ${t}`);
const titulo = (t) => console.log(`\n${t}\n${"-".repeat(t.length)}`);

const URL_APP = "https://salesacademy.crmsimplifica.com.br";
const ROTA_WEBHOOK = `${URL_APP}/api/stripe/webhook`;
const EVENTOS = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

let problemas = 0;
const falha = (t) => {
  erro(t);
  problemas++;
};

// ---------- 1. Variáveis ----------
titulo("1. Variáveis no .env.local");

const chave = env.STRIPE_SECRET_KEY ?? "";
const modoChave = chave.startsWith("sk_live_")
  ? "live"
  : chave.startsWith("sk_test_")
    ? "test"
    : null;

if (!chave) falha("STRIPE_SECRET_KEY vazia.");
else if (!modoChave) falha("STRIPE_SECRET_KEY não parece uma chave do Stripe.");
else ok(`STRIPE_SECRET_KEY presente — modo ${modoChave.toUpperCase()}`);

if (env.STRIPE_MOCK === "false") ok("STRIPE_MOCK=false (usando o Stripe de verdade)");
else falha(`STRIPE_MOCK=${env.STRIPE_MOCK ?? "(ausente)"} — precisa ser false para cobrar.`);

const link = env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";
const modoLink = link.includes("/test_") ? "test" : link ? "live" : null;
if (!link) falha("NEXT_PUBLIC_STRIPE_PAYMENT_LINK vazio.");
else ok(`Link de pagamento presente — modo ${modoLink.toUpperCase()}`);

if (env.NEXT_PUBLIC_SUPPORT_WHATSAPP) ok("WhatsApp do comercial configurado");
else aviso("NEXT_PUBLIC_SUPPORT_WHATSAPP vazio (botões de suporte caem no grupo).");

// O erro clássico: misturar modos.
if (modoChave && modoLink && modoChave !== modoLink) {
  falha(
    `MODOS DIFERENTES: chave é ${modoChave.toUpperCase()} e link é ${modoLink.toUpperCase()}. ` +
      `Nesse estado o cliente paga e a assinatura NUNCA ativa.`
  );
}

if (!chave || !modoChave) {
  console.log("\nSem chave válida não dá para conferir o resto. Preencha e rode de novo.");
  process.exit(1);
}

const stripe = new Stripe(chave);

// ---------- 2. Conta ----------
titulo("2. Conta Stripe");
let conta;
try {
  conta = await stripe.accounts.retrieve();
  ok(`Conectado: ${conta.settings?.dashboard?.display_name ?? conta.id}`);
} catch (e) {
  falha(`Não consegui falar com o Stripe: ${e.message}`);
  process.exit(1);
}

if (conta.charges_enabled) ok("Pode receber pagamentos");
else falha("A conta AINDA NÃO pode receber pagamentos (cadastro incompleto).");

if (conta.payouts_enabled) ok("Pode receber repasses na conta bancária");
else aviso("Repasses ainda não liberados — o dinheiro entra mas não sai para o banco.");

// ---------- 3. Produto e preço ----------
titulo("3. Produto e preço");
const precos = await stripe.prices.list({ limit: 100, active: true, expand: ["data.product"] });
const recorrentes = precos.data.filter((p) => p.recurring);

if (recorrentes.length === 0) {
  falha("Nenhum preço RECORRENTE ativo. Assinatura precisa de preço recorrente, não avulso.");
} else {
  for (const p of recorrentes) {
    const nome = typeof p.product === "object" ? p.product.name : p.product;
    const valor = (p.unit_amount / 100).toFixed(2);
    ok(`${nome} — R$ ${valor} / ${p.recurring.interval === "month" ? "mês" : p.recurring.interval}`);
  }
}

// ---------- 4. Link de pagamento ----------
titulo("4. Link de pagamento");
let links = { data: [] };
try {
  links = await stripe.paymentLinks.list({ limit: 100 });
} catch (e) {
  aviso(`Não consegui listar os links: ${e.message}`);
}

const ativos = links.data.filter((l) => l.active);
if (ativos.length === 0) {
  falha("Nenhum link de pagamento ativo. Crie em dashboard.stripe.com/payment-links");
} else {
  ok(`${ativos.length} link(s) ativo(s)`);
  const usado = ativos.find((l) => link.startsWith(l.url));
  if (!usado) {
    falha(`O link do .env não está entre os ativos desta conta: ${link}`);
  } else {
    ok(`O link do .env existe e está ativo`);
    const depois = usado.after_completion;
    const redir = depois?.redirect?.url ?? null;
    if (!redir) {
      falha(
        'Sem redirecionamento após o pagamento. Configure "Redirecionar clientes" para ' +
          `${URL_APP}/checkout?pago=1`
      );
    } else if (!redir.includes("/checkout")) {
      aviso(`Redireciona para ${redir} — o recomendado é ${URL_APP}/checkout?pago=1`);
    } else if (!redir.includes("pago=1")) {
      aviso(`Redireciona para ${redir} — falta o ?pago=1, que faz a tela aguardar a confirmação.`);
    } else {
      ok(`Redireciona certo: ${redir}`);
    }
  }
}

// ---------- 5. Webhook ----------
titulo("5. Webhook");
if (!env.STRIPE_WEBHOOK_SECRET) {
  falha("STRIPE_WEBHOOK_SECRET vazio — sem ele o app RECUSA os avisos do Stripe.");
} else if (!env.STRIPE_WEBHOOK_SECRET.startsWith("whsec_")) {
  falha("STRIPE_WEBHOOK_SECRET não parece um signing secret (deve começar com whsec_).");
} else {
  ok("STRIPE_WEBHOOK_SECRET presente");
}

let endpoints = { data: [] };
try {
  endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
} catch (e) {
  aviso(`Não consegui listar os webhooks: ${e.message}`);
}

const nosso = endpoints.data.find((w) => w.url === ROTA_WEBHOOK);
if (endpoints.data.length === 0) {
  falha(`Nenhum webhook nesta conta. Crie apontando para ${ROTA_WEBHOOK}`);
} else if (!nosso) {
  falha(`Nenhum webhook aponta para ${ROTA_WEBHOOK}. Encontrados:`);
  for (const w of endpoints.data) console.log(`            · ${w.url}`);
} else {
  ok(`Webhook encontrado (${nosso.status === "enabled" ? "ativo" : nosso.status})`);
  const temTodos = nosso.enabled_events.includes("*");
  const faltando = EVENTOS.filter((e) => !nosso.enabled_events.includes(e));
  if (temTodos) {
    aviso("Está ouvindo TODOS os eventos — funciona, mas polui muito os registros.");
  } else if (faltando.length) {
    falha(`Faltam eventos no webhook: ${faltando.join(", ")}`);
  } else {
    ok("Os 3 eventos necessários estão marcados");
  }
}

// ---------- 6. Assinaturas ----------
titulo("6. Assinaturas existentes");
const assinaturas = await stripe.subscriptions.list({ limit: 5 });
if (assinaturas.data.length === 0) {
  console.log("  Nenhuma assinatura ainda (esperado antes da primeira venda).");
} else {
  for (const s of assinaturas.data) {
    console.log(`  · ${s.id} — ${s.status}${s.cancel_at_period_end ? " (cancelando)" : ""}`);
  }
}

// ---------- Resultado ----------
titulo("Resultado");
if (problemas === 0) {
  console.log("  Tudo pronto. Pode fazer a primeira compra de verdade.");
} else {
  console.log(`  ${problemas} item(ns) precisam ser resolvidos antes de vender.`);
}
console.log(
  "\nLembrete: estas variáveis também precisam estar no EasyPanel — o site no ar\n" +
    "não lê o .env.local. Depois de cadastrar lá, faça um novo deploy.\n"
);
process.exit(problemas === 0 ? 0 : 1);
