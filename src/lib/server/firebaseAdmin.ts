import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

/**
 * Credenciais do backend. Aceita, nesta ordem:
 *   1. service-account.json na raiz do projeto (mais simples para dev)
 *   2. variáveis de ambiente FIREBASE_ADMIN_* (recomendado em produção)
 */
function loadServiceAccount(): ServiceAccount {
  // Procura o arquivo tanto na raiz do projeto quanto na pasta-pai
  // (o dev server pode ser iniciado de qualquer uma via npm --prefix).
  const candidates = [
    join(process.cwd(), "service-account.json"),
    join(process.cwd(), "simplifica-sales-academy", "service-account.json"),
  ];
  const filePath = candidates.find((p) => existsSync(p));
  if (filePath) {
    const raw = JSON.parse(readFileSync(filePath, "utf8"));
    return {
      projectId: raw.project_id,
      clientEmail: raw.client_email,
      privateKey: raw.private_key,
    };
  }

  const { FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL } = process.env;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(
    /\\n/g,
    "\n"
  );
  if (!FIREBASE_ADMIN_PROJECT_ID || !FIREBASE_ADMIN_CLIENT_EMAIL || !privateKey) {
    throw new Error(
      "Credenciais do Firebase Admin ausentes. Adicione service-account.json na raiz ou as variáveis FIREBASE_ADMIN_* no .env.local."
    );
  }
  return {
    projectId: FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey,
  };
}

const adminApp = getApps().length
  ? getApp()
  : initializeApp({ credential: cert(loadServiceAccount()) });

export const adminAuth = getAuth(adminApp);
// Banco NOMEADO "default" neste projeto (não o "(default)" padrão).
export const adminDb = getFirestore(adminApp, "default");
