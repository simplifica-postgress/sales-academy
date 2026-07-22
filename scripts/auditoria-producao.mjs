// AUDITORIA DE PRODUÇÃO — não gasta credito de IA.
//
// Cobre: rotas no ar, fronteiras de permissão dos endpoints, integridade dos
// dados e um teste de carga leve (só páginas, nada de IA).
//
// Uso:  node scripts/auditoria-producao.mjs
//       BASE=http://localhost:3000 node scripts/auditoria-producao.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const BASE = process.env.BASE || "https://salesacademy.crmsimplifica.com.br";
const env = {};
for (const l of readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const sa = JSON.parse(readFileSync(join(process.cwd(), "service-account.json"), "utf8"));
const app = initializeApp({
  credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }),
});
const db = getFirestore(app, "default");

let ok = 0;
let falhas = 0;
const problemas = [];

function check(nome, passou, detalhe = "") {
  if (passou) {
    ok += 1;
    console.log(`  OK    ${nome}`);
  } else {
    falhas += 1;
    problemas.push(`${nome} ${detalhe}`);
    console.log(`  FALHA ${nome} ${detalhe}`);
  }
}

async function tokenDe(email) {
  const uid = (await getAuth(app).getUserByEmail(email)).uid;
  const ct = await getAuth(app).createCustomToken(uid);
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: ct, returnSecureToken: true }) }
  ).then((x) => x.json());
  return { uid, idToken: r.idToken };
}

async function post(rota, body, token) {
  const h = { "Content-Type": "application/json" };
  if (token) h.Authorization = `Bearer ${token}`;
  const r = await fetch(`${BASE}${rota}`, { method: "POST", headers: h, body: JSON.stringify(body) });
  return r.status;
}

async function main() {
  console.log(`AUDITORIA — ${BASE}\n`);

  // ---------- 1. Rotas no ar ----------
  console.log("1. Paginas respondendo");
  const rotas = ["/", "/login", "/cadastro", "/dashboard", "/upload", "/historico", "/principios", "/admin", "/admin/usuarios", "/admin/conhecimento", "/admin/testar-ia", "/api/health"];
  for (const rota of rotas) {
    try {
      const r = await fetch(`${BASE}${rota}`, { redirect: "manual" });
      check(`${rota} (${r.status})`, r.status < 400 || r.status === 401);
    } catch (e) {
      check(rota, false, `-> ${e.message}`);
    }
  }

  // ---------- 2. Fronteiras de permissao ----------
  console.log("\n2. Endpoints protegidos (sem token deve negar)");
  for (const rota of ["/api/admin/companies", "/api/admin/set-role", "/api/admin/create-user", "/api/admin/test-analysis", "/api/admin/retention", "/api/admin/delete-recording", "/api/analyze"]) {
    const s = await post(rota, {}, null);
    check(`${rota} sem token -> ${s}`, s === 401);
  }

  console.log("\n3. Vendedor NAO pode usar endpoints de gestao");
  let vendedor;
  try {
    vendedor = await tokenDe("teste.vendedor@simplifica.dev");
  } catch {
    console.log("  (conta de teste do vendedor nao encontrada, pulando)");
  }
  if (vendedor?.idToken) {
    for (const rota of ["/api/admin/companies", "/api/admin/set-role", "/api/admin/create-user", "/api/admin/test-analysis", "/api/admin/retention"]) {
      const s = await post(rota, { action: "create", name: "x", uid: "x", role: "master" }, vendedor.idToken);
      check(`${rota} como vendedor -> ${s}`, s === 403);
    }
  }

  // ---------- 4. Integridade dos dados ----------
  console.log("\n4. Integridade dos dados");
  const [users, analyses, uploads, progress, companies] = await Promise.all([
    db.collection("users").get(),
    db.collection("analyses").get(),
    db.collection("uploads").get(),
    db.collection("progress").get(),
    db.collection("companies").get(),
  ]);
  const uids = new Set(users.docs.map((d) => d.id));
  const cids = new Set(companies.docs.map((d) => d.id));

  check(`todo usuario tem papel valido`, users.docs.every((d) => ["seller", "manager", "master"].includes(d.get("role"))),
    users.docs.filter((d) => !["seller", "manager", "master"].includes(d.get("role"))).map((d) => d.get("email")).join(", "));

  check(`todo usuario tem o campo companyId`, users.docs.every((d) => Object.prototype.hasOwnProperty.call(d.data(), "companyId")),
    users.docs.filter((d) => !Object.prototype.hasOwnProperty.call(d.data(), "companyId")).map((d) => d.get("email")).join(", "));

  const empresaFantasma = users.docs.filter((d) => d.get("companyId") && !cids.has(d.get("companyId")));
  check(`ninguem aponta para empresa inexistente`, empresaFantasma.length === 0,
    empresaFantasma.map((d) => d.get("email")).join(", "));

  const analiseOrfa = analyses.docs.filter((d) => !uids.has(d.get("userId")));
  check(`nenhuma analise orfa`, analiseOrfa.length === 0, `${analiseOrfa.length} sem dono`);

  const semCompany = analyses.docs.filter((d) => !Object.prototype.hasOwnProperty.call(d.data(), "companyId"));
  check(`toda analise tem companyId (senao o gestor nao le)`, semCompany.length === 0, `${semCompany.length} sem o campo`);

  const upSemCompany = uploads.docs.filter((d) => !Object.prototype.hasOwnProperty.call(d.data(), "companyId"));
  check(`todo envio tem companyId`, upSemCompany.length === 0, `${upSemCompany.length} sem o campo`);

  // O companyId copiado precisa bater com o do dono, senao o gestor ve o que nao devia.
  const donoDe = new Map(users.docs.map((d) => [d.id, d.get("companyId") ?? null]));
  const divergentes = analyses.docs.filter((d) => uids.has(d.get("userId")) && (d.get("companyId") ?? null) !== donoDe.get(d.get("userId")));
  check(`companyId das analises bate com o do vendedor`, divergentes.length === 0, `${divergentes.length} divergentes`);

  const progOrfao = progress.docs.filter((d) => !uids.has(d.id));
  check(`nenhum progresso orfao`, progOrfao.length === 0, `${progOrfao.length} sem usuario`);

  // Cada empresa deveria ter no maximo um gestor (a UI assume isso).
  const gestoresPorEmpresa = {};
  users.docs.filter((d) => d.get("role") === "manager" && d.get("companyId")).forEach((d) => {
    gestoresPorEmpresa[d.get("companyId")] = (gestoresPorEmpresa[d.get("companyId")] ?? 0) + 1;
  });
  const multiplos = Object.entries(gestoresPorEmpresa).filter(([, n]) => n > 1);
  check(`no maximo um gestor por empresa`, multiplos.length === 0, JSON.stringify(multiplos));

  check(`existe pelo menos um master`, users.docs.some((d) => d.get("role") === "master"));

  // ---------- 5. Carga leve (sem IA) ----------
  console.log("\n5. Carga leve — 30 requisicoes simultaneas (sem custo de IA)");
  const t0 = Date.now();
  const res = await Promise.all(
    Array.from({ length: 30 }, () =>
      fetch(`${BASE}/api/health`).then((r) => ({ s: r.status })).catch(() => ({ s: 0 }))
    )
  );
  const dur = Date.now() - t0;
  const okReq = res.filter((r) => r.s === 200).length;
  check(`30/30 responderam 200 (${okReq}/30 em ${dur}ms)`, okReq === 30);
  check(`tempo total abaixo de 15s (${(dur / 1000).toFixed(1)}s)`, dur < 15000);

  // ---------- Resumo ----------
  console.log(`\n=== RESUMO ===`);
  console.log(`  ${ok} passaram | ${falhas} falharam`);
  console.log(`  Base: ${users.size} usuarios, ${companies.size} empresas, ${analyses.size} analises, ${uploads.size} envios`);
  if (problemas.length) {
    console.log(`\n  Problemas:`);
    problemas.forEach((p) => console.log(`   - ${p}`));
  }
  process.exit(falhas > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
