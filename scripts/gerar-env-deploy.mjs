// Gera o bloco de variáveis de ambiente pronto para colar no EasyPanel.
// Lê o .env.local e o service-account.json e escreve em deploy-env.txt
// (gitignored). A private key sai com \n escapado, que é o formato que o
// painel aceita em uma única linha.
//
// Uso: node scripts/gerar-env-deploy.mjs
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

if (!existsSync(join(ROOT, ".env.local"))) {
  console.error("Faltando .env.local na raiz.");
  process.exit(1);
}
if (!existsSync(join(ROOT, "service-account.json"))) {
  console.error("Faltando service-account.json na raiz.");
  process.exit(1);
}

const env = {};
for (const line of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const sa = JSON.parse(readFileSync(join(ROOT, "service-account.json"), "utf8"));

const PUBLIC_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
];

const missing = PUBLIC_KEYS.filter((k) => !env[k]);
if (missing.length) {
  console.error("Faltando no .env.local:", missing.join(", "));
  process.exit(1);
}

// A private key tem quebras de linha reais; o painel precisa de \n literal.
const privateKeyEscaped = sa.private_key.replace(/\n/g, "\\n");

const lines = [
  "# ---- Publicas (embutidas no build) ----",
  ...PUBLIC_KEYS.map((k) => `${k}=${env[k]}`),
  `NEXT_PUBLIC_RETENTION_DAYS=${env.NEXT_PUBLIC_RETENTION_DAYS ?? 60}`,
  "",
  "# ---- Segredos (runtime) ----",
  `OPENAI_API_KEY=${env.OPENAI_API_KEY ?? ""}`,
  "AI_MOCK=false",
  `FIREBASE_ADMIN_PROJECT_ID=${sa.project_id}`,
  `FIREBASE_ADMIN_CLIENT_EMAIL=${sa.client_email}`,
  `FIREBASE_ADMIN_PRIVATE_KEY="${privateKeyEscaped}"`,
];

const out = join(ROOT, "deploy-env.txt");
writeFileSync(out, lines.join("\n") + "\n", "utf8");

console.log("Arquivo gerado:", out);
console.log("");
console.log("Abra, COPIE TUDO e cole no campo 'Variáveis de Ambiente' do EasyPanel.");
console.log("");
console.log("Conferencia (valores ocultos):");
for (const l of lines) {
  if (!l || l.startsWith("#")) continue;
  const [k, ...rest] = l.split("=");
  const v = rest.join("=");
  const shown = k.startsWith("NEXT_PUBLIC_") ? v : `<${v.length} caracteres>`;
  console.log(`  ${k} = ${shown}`);
}
console.log("");
console.log("ATENCAO: deploy-env.txt contem segredos. Nao commite (ja esta no .gitignore).");
