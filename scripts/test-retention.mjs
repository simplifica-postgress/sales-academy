// Testa a retenção: só apaga gravações vencidas, preservando as recentes
// e TODAS as análises. Uso: node scripts/test-retention.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

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
  storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
});
const db = getFirestore(app, "default");
const bucket = getStorage(app).bucket();
const DAYS = Number(env.NEXT_PUBLIC_RETENTION_DAYS ?? 60);

async function idTokenFor(mail) {
  const uid = (await getAuth(app).getUserByEmail(mail)).uid;
  const ct = await getAuth(app).createCustomToken(uid);
  const r = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${env.NEXT_PUBLIC_FIREBASE_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: ct, returnSecureToken: true }),
    }
  ).then((x) => x.json());
  return { uid, idToken: r.idToken };
}

// Cria um envio ficticio com data controlada + arquivo real no Storage.
async function makeUpload(uid, ageDays, label) {
  const path = `uploads/${uid}/${Date.now()}-${label}.mp3`;
  await bucket.file(path).save(Buffer.alloc(1024, 1), { contentType: "audio/mpeg" });
  const ref = db.collection("uploads").doc();
  await ref.set({
    userId: uid,
    filePath: path,
    fileUrl: "",
    fileType: "audio",
    mimeType: "audio/mpeg",
    status: "done",
    trainingDay: 1,
    attendanceType: "reuniao",
    observation: `teste retencao ${label}`,
    consentVersion: "1.0",
    fileDeleted: false,
    createdAt: Timestamp.fromDate(new Date(Date.now() - ageDays * 86400000)),
  });
  // Análise vinculada (precisa sobreviver à limpeza)
  const an = db.collection("analyses").doc();
  await an.set({
    userId: uid,
    uploadId: ref.id,
    transcript: "transcricao de teste que deve sobreviver",
    summary: `analise ${label}`,
    strengths: ["a"],
    mistakes: ["b"],
    improvements: ["c"],
    criteriaScores: {},
    generalScore: 70,
    nextMission: "missao que deve sobreviver",
    trainingDay: 1,
    createdAt: Timestamp.fromDate(new Date(Date.now() - ageDays * 86400000)),
  });
  return { uploadId: ref.id, analysisId: an.id, path };
}

async function main() {
  const admin = await idTokenFor("thiagobrito1018@gmail.com");
  const seller = await idTokenFor("teste.vendedor@simplifica.dev");

  console.log(`Retencao configurada: ${DAYS} dias\n`);

  const old = await makeUpload(seller.uid, DAYS + 2, "vencida");
  const fresh = await makeUpload(seller.uid, 3, "recente");
  console.log(`Criados: 1 gravacao de ${DAYS + 2} dias (vencida) e 1 de 3 dias (recente)\n`);

  const res = await fetch("http://localhost:3000/api/admin/retention", {
    method: "POST",
    headers: { Authorization: `Bearer ${admin.idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  }).then((r) => r.json());
  console.log("Limpeza:", JSON.stringify(res), "\n");

  const [oldExists] = await bucket.file(old.path).exists();
  const [freshExists] = await bucket.file(fresh.path).exists();
  const oldUp = await db.collection("uploads").doc(old.uploadId).get();
  const oldAn = await db.collection("analyses").doc(old.analysisId).get();
  const freshUp = await db.collection("uploads").doc(fresh.uploadId).get();

  console.log("--- RESULTADO ---");
  console.log("Gravacao VENCIDA apagada do Storage:", !oldExists ? "✅" : "❌");
  console.log("  marcada como excluida:", oldUp.get("fileDeleted") === true ? "✅" : "❌");
  console.log("  por:", oldUp.get("fileDeletedBy"));
  console.log("  ANALISE preservada:", oldAn.exists ? "✅" : "❌", "| missao:", oldAn.get("nextMission"));
  console.log("Gravacao RECENTE mantida no Storage:", freshExists ? "✅" : "❌");
  console.log("  intacta:", freshUp.get("fileDeleted") === false ? "✅" : "❌");

  // Vendedor nao pode disparar a limpeza
  const sellerTry = await fetch("http://localhost:3000/api/admin/retention", {
    method: "POST",
    headers: { Authorization: `Bearer ${seller.idToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  console.log("Vendedor tenta rodar limpeza:", sellerTry.status === 403 ? "✅ 403" : "❌ " + sellerTry.status);

  // Limpeza dos dados de teste
  await bucket.file(fresh.path).delete({ ignoreNotFound: true });
  for (const id of [old.uploadId, fresh.uploadId]) await db.collection("uploads").doc(id).delete();
  for (const id of [old.analysisId, fresh.analysisId]) await db.collection("analyses").doc(id).delete();
  console.log("\nDados de teste removidos.");
  process.exit(0);
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
