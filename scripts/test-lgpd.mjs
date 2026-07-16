// Testa consentimento obrigatório e exclusão de gravação preservando análise.
// Uso: node scripts/test-lgpd.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
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
const BASE = "http://localhost:3000";

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

const post = (path, token, body) =>
  fetch(BASE + path, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

async function main() {
  const seller = await idTokenFor("teste.vendedor@simplifica.dev");
  const admin = await idTokenFor("thiagobrito1018@gmail.com");

  // Sobe um arquivo de teste
  const filePath = `uploads/${seller.uid}/${Date.now()}-lgpd.mp3`;
  await bucket.file(filePath).save(Buffer.alloc(2048, 1), { contentType: "audio/mpeg" });

  console.log("--- 1. Consentimento obrigatorio ---");
  const noConsent = await post("/api/analyze", seller.idToken, {
    filePath,
    attendanceType: "reuniao",
  });
  console.log("Envio SEM consentimento ->", noConsent.status, noConsent.body.error ?? "");

  const withConsent = await post("/api/analyze", seller.idToken, {
    filePath,
    attendanceType: "reuniao",
    consent: true,
  });
  console.log("Envio COM consentimento ->", withConsent.status, withConsent.status === 200 ? `analise ${withConsent.body.analysisId}` : withConsent.body.error);

  if (withConsent.status !== 200) process.exit(1);
  const analysisId = withConsent.body.analysisId;

  // Confere trilha de consentimento gravada
  const anSnap = await db.collection("analyses").doc(analysisId).get();
  const upSnap = await db.collection("uploads").doc(anSnap.get("uploadId")).get();
  console.log(
    "Trilha registrada -> versao:",
    upSnap.get("consentVersion"),
    "| aceito em:",
    upSnap.get("consentAt")?.toDate?.().toISOString().slice(0, 19) ?? "?"
  );

  console.log("\n--- 2. Exclusao da gravacao (mantendo a analise) ---");
  const [existsBefore] = await bucket.file(filePath).exists();
  console.log("Arquivo no Storage antes:", existsBefore);

  // Vendedor NAO pode excluir (so gestor)
  const sellerTry = await post("/api/admin/delete-recording", seller.idToken, {
    uploadId: upSnap.id,
  });
  console.log("Vendedor tenta excluir ->", sellerTry.status, sellerTry.body.error ?? "");

  const del = await post("/api/admin/delete-recording", admin.idToken, {
    uploadId: upSnap.id,
  });
  console.log("Gestor exclui ->", del.status, JSON.stringify(del.body));

  const [existsAfter] = await bucket.file(filePath).exists();
  const upAfter = await db.collection("uploads").doc(upSnap.id).get();
  const anAfter = await db.collection("analyses").doc(analysisId).get();

  console.log("\n--- RESULTADO ---");
  console.log("Arquivo no Storage depois:", existsAfter, existsAfter ? "❌" : "✅ apagado");
  console.log("Upload marcado como excluido:", upAfter.get("fileDeleted") === true ? "✅" : "❌");
  console.log("ANALISE preservada:", anAfter.exists ? "✅" : "❌");
  console.log("  nota:", anAfter.get("generalScore"));
  console.log("  transcricao mantida:", (anAfter.get("transcript") ?? "").length, "caracteres");
  console.log("  proxima missao mantida:", (anAfter.get("nextMission") ?? "").slice(0, 60) + "…");

  process.exit(0);
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
