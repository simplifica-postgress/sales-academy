// Testa a segurança do fluxo com Storage.
// Uso: node scripts/test-storage-security.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
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

const analyze = (token, body) =>
  fetch(BASE + "/api/analyze", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));

async function main() {
  const seller = await idTokenFor("teste.vendedor@simplifica.dev");
  const admin = await idTokenFor("thiagobrito1018@gmail.com");
  const bucket = getStorage(app).bucket();

  // Arquivo real na pasta do ADMIN (para o vendedor tentar roubar).
  const victimPath = `uploads/${admin.uid}/${Date.now()}-alheio.mp3`;
  await bucket.file(victimPath).save(Buffer.alloc(2048, 1), { contentType: "audio/mpeg" });

  // 1. Vendedor tenta analisar arquivo de OUTRO usuário
  const stealing = await analyze(seller.idToken, {
    filePath: victimPath,
    attendanceType: "reuniao",
  });
  console.log("1. Vendedor tenta analisar arquivo alheio ->", stealing.status, stealing.body.error ?? "");

  // 2. Path traversal
  const traversal = await analyze(seller.idToken, {
    filePath: `uploads/${seller.uid}/../${admin.uid}/x.mp3`,
    attendanceType: "reuniao",
  });
  console.log("2. Path traversal ->", traversal.status, traversal.body.error ?? "");

  // 3. Arquivo inexistente na propria pasta
  const missing = await analyze(seller.idToken, {
    filePath: `uploads/${seller.uid}/nao-existe.mp3`,
    attendanceType: "reuniao",
  });
  console.log("3. Arquivo inexistente ->", missing.status, missing.body.error ?? "");

  // 4. Sem filePath
  const empty = await analyze(seller.idToken, { attendanceType: "reuniao" });
  console.log("4. Sem filePath ->", empty.status, empty.body.error ?? "");

  // 5. Tipo de arquivo nao suportado (pdf) na propria pasta
  const badTypePath = `uploads/${seller.uid}/${Date.now()}-doc.pdf`;
  await bucket.file(badTypePath).save(Buffer.alloc(1024, 1), { contentType: "application/pdf" });
  const badType = await analyze(seller.idToken, { filePath: badTypePath, attendanceType: "reuniao" });
  console.log("5. Arquivo PDF ->", badType.status, badType.body.error ?? "");

  // Limpeza
  await bucket.file(victimPath).delete().catch(() => {});
  await bucket.file(badTypePath).delete().catch(() => {});
  console.log("\nArquivos de teste removidos.");
  process.exit(0);
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
