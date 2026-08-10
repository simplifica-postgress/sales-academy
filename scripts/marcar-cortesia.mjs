// Dá acesso de CORTESIA (vitalício, sem pagar) às contas que já existem.
//
// Por que existe: quem confiou na ferramenta antes de haver cobrança não pode
// acordar bloqueado no dia em que o pagamento for ligado. Rode UMA VEZ, antes
// de ligar o NEXT_PUBLIC_PAYWALL.
//
// Uso:
//   node scripts/marcar-cortesia.mjs            -> mostra o que faria (não grava)
//   node scripts/marcar-cortesia.mjs --aplicar   -> grava
//   node scripts/marcar-cortesia.mjs --remover a@b.com   -> tira a cortesia de alguém
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

const args = process.argv.slice(2);
const aplicar = args.includes("--aplicar");
const removerIdx = args.indexOf("--remover");

// ---- remover cortesia de uma conta ----
if (removerIdx !== -1) {
  const email = (args[removerIdx + 1] ?? "").trim().toLowerCase();
  if (!email) {
    console.error("Informe o e-mail: --remover pessoa@empresa.com");
    process.exit(1);
  }
  const achado = await db.collection("users").where("email", "==", email).limit(1).get();
  if (achado.empty) {
    console.error(`Nenhuma conta com o e-mail ${email}.`);
    process.exit(1);
  }
  await achado.docs[0].ref.update({ courtesyAccess: FieldValue.delete() });
  console.log(`Cortesia removida de ${email}. A partir de agora essa conta precisa de assinatura.`);
  process.exit(0);
}

// ---- marcar todos os existentes ----
const users = await db.collection("users").get();

const jaTem = [];
const vaiMarcar = [];
const naoPrecisa = [];

for (const d of users.docs) {
  const email = d.get("email") ?? "(sem e-mail)";
  const role = d.get("role") ?? "seller";
  if (d.get("courtesyAccess") === true) {
    jaTem.push(email);
  } else if (role === "master" || role === "manager") {
    // Já entram por serem staff — marcar seria ruído.
    naoPrecisa.push(`${email} (${role})`);
  } else {
    vaiMarcar.push({ email, ref: d.ref });
  }
}

console.log(`Contas na plataforma: ${users.size}`);
console.log(`  já com cortesia: ${jaTem.length}`);
console.log(`  entram por serem master/gestor: ${naoPrecisa.length}`);
console.log(`  receberão cortesia agora: ${vaiMarcar.length}`);
if (vaiMarcar.length) {
  console.log("\nSerão marcadas:");
  for (const u of vaiMarcar) console.log(`  · ${u.email}`);
}

if (!aplicar) {
  console.log("\n(simulação — nada foi gravado)");
  console.log("Para aplicar de verdade: node scripts/marcar-cortesia.mjs --aplicar");
  process.exit(0);
}

let n = 0;
for (let i = 0; i < vaiMarcar.length; i += 400) {
  const lote = db.batch();
  for (const u of vaiMarcar.slice(i, i + 400)) {
    lote.update(u.ref, { courtesyAccess: true });
    n++;
  }
  await lote.commit();
}

console.log(`\n${n} conta(s) marcadas com cortesia vitalícia.`);
console.log("Agora pode ligar o NEXT_PUBLIC_PAYWALL=true sem barrar ninguém que já usava.");
process.exit(0);
