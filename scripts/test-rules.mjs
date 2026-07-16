// Auditoria das Security Rules do Firestore (o "RLS" do Firebase).
// Autentica como VENDEDOR pelo SDK do cliente e tenta abusar do banco.
// Uso: node scripts/test-rules.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  initializeFirestore,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const env = {};
for (const line of readFileSync(join(process.cwd(), ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

const app = initializeApp({
  apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: env.NEXT_PUBLIC_FIREBASE_APP_ID,
});
const auth = getAuth(app);
const db = initializeFirestore(app, {}, "default");

const SELLER = { email: "teste.vendedor@simplifica.dev", pass: "Teste123!" };
const ADMIN_UID = "260Ta9zwwhbeQWm3XbMDFHiHnkE2"; // conta do gestor

// Executa e reporta se foi PERMITIDO (perigo) ou BLOQUEADO (ok).
async function probe(label, fn, { shouldBlock = true } = {}) {
  try {
    await fn();
    const bad = shouldBlock;
    console.log(`${bad ? "❌ FURO " : "✅ ok   "} | ${label} -> PERMITIDO`);
    return !bad;
  } catch (e) {
    const denied = e.code === "permission-denied";
    const ok = shouldBlock && denied;
    console.log(
      `${ok ? "✅ ok   " : "❌ FALHA"} | ${label} -> ${denied ? "BLOQUEADO" : "ERRO: " + e.code}`
    );
    return ok;
  }
}

async function main() {
  const cred = await signInWithEmailAndPassword(auth, SELLER.email, SELLER.pass);
  const uid = cred.user.uid;
  console.log(`Autenticado como VENDEDOR (${uid})\n`);

  console.log("--- Tentativas de fraude no proprio perfil ---");
  await probe("Vendedor forja o proprio progresso (progressPercent=100, nivel 5)", () =>
    updateDoc(doc(db, "users", uid), {
      progressPercent: 100,
      currentLevel: 5,
      averageScore: 99,
    })
  );
  await probe("Vendedor vira admin sozinho", () =>
    updateDoc(doc(db, "users", uid), { role: "admin" })
  );
  await probe("Vendedor adianta o treinamento (currentDay=30)", () =>
    updateDoc(doc(db, "users", uid), { currentDay: 30 })
  );

  console.log("\n--- Tentativas na colecao progress ---");
  await probe("Vendedor forja progress (media 100, atendimento ideal)", () =>
    setDoc(doc(db, "progress", uid), {
      totalUploads: 99,
      completedDays: 30,
      currentLevel: 5,
      bestScore: 100,
      averageScore: 100,
      idealAttendanceReached: true,
      highScoreStreak: 30,
      lastAnalysisDate: null,
    })
  );

  console.log("\n--- Tentativas de forjar envio/analise ---");
  await probe("Vendedor cria upload direto no banco", () =>
    setDoc(doc(collection(db, "uploads")), {
      userId: uid,
      status: "done",
      fileType: "audio",
      trainingDay: 1,
      attendanceType: "reuniao",
      observation: "",
      createdAt: new Date(),
    })
  );
  await probe("Vendedor cria analise com nota 100", () =>
    setDoc(doc(collection(db, "analyses")), {
      userId: uid,
      generalScore: 100,
      summary: "forjado",
      strengths: [],
      mistakes: [],
      improvements: [],
      criteriaScores: {},
      nextMission: "",
      transcript: "",
      trainingDay: 1,
      createdAt: new Date(),
    })
  );

  console.log("\n--- Tentativas de vazamento de dados de terceiros (LGPD) ---");
  await probe("Vendedor le o perfil do gestor", () =>
    getDoc(doc(db, "users", ADMIN_UID)).then((s) => {
      if (!s.exists()) throw { code: "not-found" };
    })
  );
  await probe("Vendedor lista TODOS os usuarios", () =>
    getDocs(collection(db, "users"))
  );
  await probe("Vendedor lista TODAS as analises da empresa", () =>
    getDocs(collection(db, "analyses"))
  );
  await probe("Vendedor lista TODOS os uploads da empresa", () =>
    getDocs(collection(db, "uploads"))
  );
  await probe("Vendedor le a base de conhecimento", () =>
    getDocs(collection(db, "knowledge"))
  );

  console.log("\n--- Acessos legitimos (devem continuar funcionando) ---");
  await probe(
    "Vendedor le o proprio perfil",
    () =>
      getDoc(doc(db, "users", uid)).then((s) => {
        if (!s.exists()) throw { code: "not-found" };
      }),
    { shouldBlock: false }
  );
  await probe(
    "Vendedor edita campos do proprio perfil (empresa/dificuldade)",
    () =>
      updateDoc(doc(db, "users", uid), {
        company: "Simplifica",
        mainDifficulty: "Leads pedem desconto e somem depois do preço.",
      }),
    { shouldBlock: false }
  );
  await probe(
    "Vendedor le o proprio progresso",
    () => getDoc(doc(db, "progress", uid)),
    { shouldBlock: false }
  );

  process.exit(0);
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
