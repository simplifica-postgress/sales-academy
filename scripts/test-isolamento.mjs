// PROVA DE ISOLAMENTO ENTRE EMPRESAS.
//
// Monta duas empresas de mentira, coloca um gestor na A e um vendedor na B,
// entra como o gestor da A usando o SDK de CLIENTE (que obedece às Rules) e
// verifica que ele NÃO lê nada da B — e que lê a própria equipe.
//
// Precisa das Rules já publicadas no Firestore. Uso:
//   node scripts/test-isolamento.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp as initAdmin } from "firebase-admin/app";
import { getAuth as getAdminAuth } from "firebase-admin/auth";
import { getFirestore as getAdminDb, FieldValue } from "firebase-admin/firestore";
import { initializeApp as initClient } from "firebase/app";
import { getAuth, signInWithCustomToken } from "firebase/auth";
import { initializeFirestore, doc, getDoc, collection, query, where, getDocs, addDoc, setDoc } from "firebase/firestore";

const ROOT = process.cwd();
const env = {};
for (const l of readFileSync(join(ROOT, ".env.local"), "utf8").split("\n")) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}
const sa = JSON.parse(readFileSync(join(ROOT, "service-account.json"), "utf8"));

const admin = initAdmin({
  credential: cert({ projectId: sa.project_id, clientEmail: sa.client_email, privateKey: sa.private_key }),
});
const adb = getAdminDb(admin, "default");

const client = initClient({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const cdb = initializeFirestore(client, {}, "default");

const PREFIX = "zz-teste-isolamento";
let pass = 0;
let fail = 0;

function check(nome, ok, detalhe = "") {
  if (ok) {
    pass += 1;
    console.log(`  OK   ${nome}`);
  } else {
    fail += 1;
    console.log(`  FALHA ${nome} ${detalhe}`);
  }
}

/** Tenta ler; devolve "ok" se leu, "negado" se as Rules barraram. */
async function tentarLer(fn) {
  try {
    await fn();
    return "ok";
  } catch (e) {
    if (String(e.code || e.message).includes("permission-denied")) return "negado";
    throw e;
  }
}

async function criarUsuario(email, dados) {
  let uid;
  try {
    uid = (await getAdminAuth(admin).getUserByEmail(email)).uid;
  } catch {
    uid = (await getAdminAuth(admin).createUser({ email, password: "Teste123!" })).uid;
  }
  await adb.collection("users").doc(uid).set({
    name: dados.name,
    email,
    role: dados.role,
    company: "",
    companyId: dados.companyId,
    salesRole: "",
    experience: "",
    attendanceTypes: [],
    mainDifficulty: "",
    goal: "",
    trainingStartDate: null,
    currentDay: 0,
    progressPercent: 0,
    averageScore: 0,
    currentLevel: 1,
    profileCompleted: true,
    createdAt: FieldValue.serverTimestamp(),
  });
  return uid;
}

async function main() {
  console.log("Montando duas empresas de teste...\n");

  const empresaA = await adb.collection("companies").add({ name: `${PREFIX}-A`, createdAt: FieldValue.serverTimestamp(), updatedAt: null });
  const empresaB = await adb.collection("companies").add({ name: `${PREFIX}-B`, createdAt: FieldValue.serverTimestamp(), updatedAt: null });

  const gestorA = await criarUsuario(`${PREFIX}-gestor-a@simplifica.dev`, { name: "Gestor A", role: "manager", companyId: empresaA.id });
  const vendedorA = await criarUsuario(`${PREFIX}-vendedor-a@simplifica.dev`, { name: "Vendedor A", role: "seller", companyId: empresaA.id });
  const vendedorB = await criarUsuario(`${PREFIX}-vendedor-b@simplifica.dev`, { name: "Vendedor B", role: "seller", companyId: empresaB.id });

  // Progresso e análise de cada vendedor, com o companyId copiado.
  for (const [uid, cid] of [[vendedorA, empresaA.id], [vendedorB, empresaB.id]]) {
    await adb.collection("progress").doc(uid).set({ companyId: cid, totalUploads: 1, completedDays: 1, currentLevel: 1, bestScore: 50, averageScore: 50, idealAttendanceReached: false, sendStreak: 1, highScoreStreak: 0, lastAnalysisDate: null });
  }
  const analiseB = await adb.collection("analyses").add({
    userId: vendedorB, companyId: empresaB.id, uploadId: "x", transcript: "segredo da empresa B",
    summary: "s", strengths: [], mistakes: [], improvements: [], criteriaScores: {},
    generalScore: 50, nextMission: "m", trainingDay: 1, createdAt: FieldValue.serverTimestamp(),
  });

  // Entra como o GESTOR DA EMPRESA A (SDK de cliente, sujeito às Rules).
  const token = await getAdminAuth(admin).createCustomToken(gestorA);
  await signInWithCustomToken(getAuth(client), token);
  console.log("Autenticado como gestor da empresa A.\n");

  console.log("Deve CONSEGUIR ler a propria empresa:");
  check("perfil do vendedor da empresa A", (await tentarLer(async () => {
    const s = await getDoc(doc(cdb, "users", vendedorA));
    if (!s.exists()) throw new Error("not-found");
  })) === "ok");
  check("progresso do vendedor da empresa A", (await tentarLer(async () => {
    const s = await getDoc(doc(cdb, "progress", vendedorA));
    if (!s.exists()) throw new Error("not-found");
  })) === "ok");
  check("consulta por companyId da empresa A", (await tentarLer(async () => {
    await getDocs(query(collection(cdb, "users"), where("companyId", "==", empresaA.id)));
  })) === "ok");
  // Princípios e Casos são material de treino, não dado de empresa: todo
  // usuário logado lê (a análise cita "Princípio N" e ele precisa consultar).
  check("ler Principios e Casos", (await tentarLer(async () => {
    await getDocs(collection(cdb, "knowledge"));
  })) === "ok");

  console.log("\nNAO pode ler a empresa B:");
  check("perfil do vendedor da empresa B", (await tentarLer(async () => {
    await getDoc(doc(cdb, "users", vendedorB));
  })) === "negado");
  check("progresso do vendedor da empresa B", (await tentarLer(async () => {
    await getDoc(doc(cdb, "progress", vendedorB));
  })) === "negado");
  check("analise da empresa B", (await tentarLer(async () => {
    await getDoc(doc(cdb, "analyses", analiseB.id));
  })) === "negado");
  check("consulta por companyId da empresa B", (await tentarLer(async () => {
    await getDocs(query(collection(cdb, "users"), where("companyId", "==", empresaB.id)));
  })) === "negado");
  check("varredura da colecao inteira de usuarios", (await tentarLer(async () => {
    await getDocs(collection(cdb, "users"));
  })) === "negado");
  check("varredura da colecao inteira de analises", (await tentarLer(async () => {
    await getDocs(collection(cdb, "analyses"));
  })) === "negado");
  // Ler os Princípios é liberado; ESCREVER neles é exclusivo do master.
  check("criar Principio (so master escreve)", (await tentarLer(async () => {
    await addDoc(collection(cdb, "knowledge"), { title: "invasao", content: "x", order: 999 });
  })) === "negado");
  check("editar Principio existente", (await tentarLer(async () => {
    const algum = (await getDocs(collection(cdb, "knowledge"))).docs[0];
    if (!algum) throw new Error("permission-denied"); // sem base, considera bloqueado
    await setDoc(algum.ref, { title: "adulterado" }, { merge: true });
  })) === "negado");
  check("promover a si mesmo a master", (await tentarLer(async () => {
    await setDoc(doc(cdb, "users", gestorA), { role: "master" }, { merge: true });
  })) === "negado");

  // Limpeza.
  console.log("\nLimpando dados de teste...");
  await adb.collection("analyses").doc(analiseB.id).delete();
  for (const uid of [gestorA, vendedorA, vendedorB]) {
    await adb.collection("progress").doc(uid).delete().catch(() => {});
    await adb.collection("users").doc(uid).delete();
    await getAdminAuth(admin).deleteUser(uid).catch(() => {});
  }
  await empresaA.delete();
  await empresaB.delete();

  console.log(`\n=== ${pass} passaram, ${fail} falharam ===`);
  if (fail > 0) console.log("ATENCAO: ha vazamento entre empresas. NAO suba isso.");
  process.exit(fail > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
