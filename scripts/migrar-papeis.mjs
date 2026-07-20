// Migra o modelo antigo (role: seller|admin) para o novo (seller|manager|master)
// e garante que todo mundo tenha companyId. Idempotente: pode rodar de novo.
//
// - role "admin"        -> "master" (quem já administrava vira Simplifica)
// - usuários sem campo  -> companyId: null (ninguém nasce numa empresa)
// - uploads/analyses/progress sem companyId -> null
//
// Uso: node scripts/migrar-papeis.mjs
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

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

async function commitInChunks(docs, patchFor) {
  let changed = 0;
  for (let i = 0; i < docs.length; i += 400) {
    const batch = db.batch();
    let n = 0;
    for (const d of docs.slice(i, i + 400)) {
      const patch = patchFor(d);
      if (!patch) continue;
      batch.update(d.ref, patch);
      n += 1;
    }
    if (n > 0) {
      await batch.commit();
      changed += n;
    }
  }
  return changed;
}

async function main() {
  const users = await db.collection("users").get();
  const changed = await commitInChunks(users.docs, (d) => {
    const patch = {};
    if (d.get("role") === "admin") patch.role = "master";
    if (d.get("companyId") === undefined) patch.companyId = null;
    return Object.keys(patch).length ? patch : null;
  });
  console.log(`users: ${changed} de ${users.size} atualizados`);

  for (const col of ["uploads", "analyses", "progress"]) {
    const snap = await db.collection(col).get();
    const n = await commitInChunks(snap.docs, (d) =>
      d.get("companyId") === undefined ? { companyId: null } : null
    );
    console.log(`${col}: ${n} de ${snap.size} atualizados`);
  }

  const masters = await db.collection("users").where("role", "==", "master").get();
  console.log(`\nMasters agora: ${masters.size}`);
  masters.forEach((d) => console.log(`  - ${d.get("email")}`));
  if (masters.size === 0) {
    console.log("\nATENCAO: ninguem e master. Promova alguem direto no Firestore.");
  }
  process.exit(0);
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
