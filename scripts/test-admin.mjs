// Verifica o painel do gestor: autentica como admin e roda as MESMAS consultas
// que a página /admin faz, validando as regras de segurança do Firestore.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";
import {
  collection,
  getDocs,
  initializeFirestore,
  query,
  where,
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

const [, , email = "admin@simplifica.dev", password = "Admin123!"] = process.argv;

async function main() {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  console.log("Autenticado como", email, "(uid " + cred.user.uid + ")\n");

  const sellersSnap = await getDocs(
    query(collection(db, "users"), where("role", "==", "seller"))
  );
  const progressSnap = await getDocs(collection(db, "progress"));
  const uploadsSnap = await getDocs(collection(db, "uploads"));
  const analysesSnap = await getDocs(collection(db, "analyses"));

  console.log("Leitura permitida pelas regras (admin):");
  console.log("  vendedores:", sellersSnap.size);
  console.log("  progress:  ", progressSnap.size);
  console.log("  uploads:   ", uploadsSnap.size);
  console.log("  analyses:  ", analysesSnap.size);

  const progress = {};
  progressSnap.forEach((d) => (progress[d.id] = d.data()));

  console.log("\nEquipe:");
  sellersSnap.forEach((d) => {
    const u = d.data();
    const p = progress[d.id] ?? {};
    console.log(
      `  - ${u.name} (${u.company}) | dia ${u.currentDay} | progresso ${u.progressPercent}% ` +
        `| media ${Math.round(p.averageScore ?? 0)} | nivel ${p.currentLevel ?? 1} ` +
        `| envios ${p.totalUploads ?? 0}`
    );
  });
  process.exit(0);
}

main().catch((e) => {
  console.error("ERRO:", e.code ?? "", e.message);
  process.exit(1);
});
