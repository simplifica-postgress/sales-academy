// Carga inicial da base de conhecimento no Firestore (coleção `knowledge`).
// A partir daí, o gestor edita tudo pelo painel (/admin/conhecimento).
//
// Uso: node scripts/seed-knowledge.mjs [--force]
//   --force  recria as entradas mesmo se a coleção já tiver conteúdo.
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

const ROOT = process.cwd();
const sa = JSON.parse(readFileSync(join(ROOT, "service-account.json"), "utf8"));
const app = initializeApp({
  credential: cert({
    projectId: sa.project_id,
    clientEmail: sa.client_email,
    privateKey: sa.private_key,
  }),
});
const db = getFirestore(app, "default");

// Extrai as entradas do módulo versionado sem depender de TS em runtime.
const src = readFileSync(join(ROOT, "src/lib/knowledge.ts"), "utf8");
const entries = [];
const re =
  /\{\s*title:\s*"((?:[^"\\]|\\.)*)",\s*source:\s*"((?:[^"\\]|\\.)*)",\s*content:\s*\n?\s*"((?:[^"\\]|\\.)*)",\s*\}/g;
let m;
while ((m = re.exec(src)) !== null) {
  const unescape = (s) => s.replace(/\\"/g, '"').replace(/\\u([0-9a-fA-F]{4})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  entries.push({
    title: unescape(m[1]),
    source: unescape(m[2]),
    content: unescape(m[3]),
  });
}

async function main() {
  if (entries.length === 0) {
    console.error("Nenhuma entrada encontrada em src/lib/knowledge.ts");
    process.exit(1);
  }

  const existing = await db.collection("knowledge").get();
  const force = process.argv.includes("--force");
  if (!existing.empty && !force) {
    console.log(
      `A coleção já tem ${existing.size} entradas. Use --force para recriar.`
    );
    process.exit(0);
  }

  if (force && !existing.empty) {
    const batch = db.batch();
    existing.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
    console.log(`Removidas ${existing.size} entradas antigas.`);
  }

  const batch = db.batch();
  entries.forEach((e, i) => {
    const ref = db.collection("knowledge").doc();
    batch.set(ref, {
      title: e.title,
      source: e.source,
      content: e.content,
      order: i + 1,
      enabled: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();

  console.log(`${entries.length} entradas gravadas na coleção 'knowledge'.`);
  entries.forEach((e, i) => console.log(`  ${i + 1}. ${e.title}`));
  process.exit(0);
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
