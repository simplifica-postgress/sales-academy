// Cria (ou promove) uma conta de gestor/admin com acesso total ao painel.
// Uso:
//   node scripts/make-admin.mjs <email> [senha] [nome]
// - Conta inexistente + senha  -> cria a conta como admin
// - Conta existente            -> promove a admin (e troca a senha, se dada)
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
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
const auth = getAuth(app);
const db = getFirestore(app, "default");

const [, , email, password, nameArg] = process.argv;
const name = nameArg || "Gestor";
if (!email) {
  console.error(
    "Informe o e-mail: node scripts/make-admin.mjs <email> [senha] [nome]"
  );
  process.exit(1);
}

async function main() {
  let user;
  try {
    user = await auth.getUserByEmail(email);
    console.log("Conta encontrada:", email);
    // Se uma senha foi informada, atualiza (permite redefinir pelo script).
    if (password) {
      await auth.updateUser(user.uid, { password, emailVerified: true });
      console.log("Senha atualizada.");
    }
  } catch {
    if (!password) {
      console.error("Conta não existe. Passe uma senha para criá-la.");
      process.exit(1);
    }
    user = await auth.createUser({
      email,
      password,
      displayName: name,
      emailVerified: true,
    });
    console.log("Conta criada:", email);
  }

  await db.collection("users").doc(user.uid).set(
    {
      name,
      email,
      role: "admin",
      profileCompleted: true,
      company: "Simplifica",
      salesRole: "Gestor",
      experience: "",
      attendanceTypes: [],
      mainDifficulty: "",
      goal: "",
      currentDay: 0,
      progressPercent: 0,
      averageScore: 0,
      currentLevel: 1,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  console.log("Papel definido como admin. UID:", user.uid);
}

main().catch((e) => {
  console.error("ERRO:", e);
  process.exit(1);
});
