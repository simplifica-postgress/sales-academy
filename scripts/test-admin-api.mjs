// Testa os endpoints /api/admin/* autenticando como gestor.
// Uso: node scripts/test-admin-api.mjs [email] [senha]
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const env = {};
for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const sa = JSON.parse(readFileSync(join(process.cwd(), "service-account.json"), "utf8"));
const app = initializeApp({
  credential: cert({
    projectId: sa.project_id,
    clientEmail: sa.client_email,
    privateKey: sa.private_key,
  }),
});

const BASE = "http://localhost:3000";
const [, , email = "thiagobrito1018@gmail.com"] = process.argv;
const SELLER_EMAIL = "teste.vendedor@simplifica.dev";

async function idTokenFor(mail) {
  const uid = (await getAuth(app).getUserByEmail(mail)).uid;
  const customToken = await getAuth(app).createCustomToken(uid);
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    }
  ).then((x) => x.json());
  if (!r.idToken) throw new Error("Falha no token: " + JSON.stringify(r));
  return { uid, idToken: r.idToken };
}

const post = (path, token, body) =>
  fetch(BASE + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

async function main() {
  const admin = await idTokenFor(email);
  const seller = await idTokenFor(SELLER_EMAIL);
  console.log("Gestor:", email, "| Vendedor:", SELLER_EMAIL, "\n");

  // 1. Vendedor NÃO pode usar endpoints de admin
  const forbidden = await post("/api/admin/set-role", seller.idToken, {
    uid: seller.uid,
    role: "admin",
  });
  console.log("1. Vendedor tenta se autopromover ->", forbidden.status, forbidden.body.error ?? "");

  // 2. Sem token
  const noAuth = await fetch(BASE + "/api/admin/set-role", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ uid: seller.uid, role: "admin" }),
  });
  console.log("2. Sem token ->", noAuth.status);

  // 3. Admin não pode se auto-rebaixar
  const selfDemote = await post("/api/admin/set-role", admin.idToken, {
    uid: admin.uid,
    role: "seller",
  });
  console.log("3. Gestor tenta se auto-rebaixar ->", selfDemote.status, selfDemote.body.error ?? "");

  // 4. Admin promove vendedor e rebaixa de volta
  const promote = await post("/api/admin/set-role", admin.idToken, {
    uid: seller.uid,
    role: "admin",
  });
  console.log("4. Gestor promove vendedor ->", promote.status, JSON.stringify(promote.body));
  const demote = await post("/api/admin/set-role", admin.idToken, {
    uid: seller.uid,
    role: "seller",
  });
  console.log("   Gestor rebaixa de volta ->", demote.status, JSON.stringify(demote.body));

  // 5. Teste da IA
  const test = await post("/api/admin/test-analysis", admin.idToken, {
    transcript:
      "Vendedor: Bom dia! Aqui e o Rafael da Simplifica. Vi que voce pediu proposta. Lead: Oi, tudo bem. Vendedor: Hoje voces usam alguma solucao? Lead: A gente perde venda no fim do mes. Vendedor: Nosso plano fica 1890 por mes. Lead: Achei alto, vou pensar. Vendedor: Ok, qualquer coisa me chama.",
    sellerName: "Rafael",
  });
  console.log(
    "5. Teste da IA ->",
    test.status,
    test.status === 200
      ? `nota ${test.body.generalScore} | mock=${test.body.mock} | base=${test.body.knowledgeChars} chars`
      : test.body.error
  );

  // 6. Validação de transcrição curta
  const short = await post("/api/admin/test-analysis", admin.idToken, { transcript: "oi" });
  console.log("6. Transcricao curta ->", short.status, short.body.error ?? "");

  process.exit(0);
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
