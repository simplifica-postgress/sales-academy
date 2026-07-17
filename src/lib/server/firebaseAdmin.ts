import "server-only";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type App,
  type ServiceAccount,
} from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getStorage } from "firebase-admin/storage";
import type { Bucket } from "@google-cloud/storage";

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
      "Credenciais do Firebase Admin ausentes. Defina FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL e FIREBASE_ADMIN_PRIVATE_KEY (ou coloque service-account.json na raiz em desenvolvimento)."
    );
  }
  return {
    projectId: FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey,
  };
}

/**
 * Inicialização PREGUIÇOSA de propósito.
 *
 * Se as credenciais fossem lidas no topo do módulo, o `next build` quebraria:
 * ele importa todas as rotas para coletar metadados, e no servidor de deploy
 * não existe service-account.json. Aqui as credenciais só são exigidas quando
 * uma rota é realmente executada.
 */
let cached: App | null = null;
function app(): App {
  if (cached) return cached;
  cached = getApps().length
    ? getApp()
    : initializeApp({
        credential: cert(loadServiceAccount()),
        storageBucket:
          process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
          "treinamentos-simplifica.firebasestorage.app",
      });
  return cached;
}

/**
 * Exportados como Proxy: o objeto só é criado no primeiro uso real, então
 * `import { adminDb }` não dispara nada em tempo de build.
 */
function lazy<T extends object>(factory: () => T): T {
  let instance: T | null = null;
  const get = () => (instance ??= factory());
  return new Proxy({} as T, {
    get(_t, prop, receiver) {
      const value = Reflect.get(get() as object, prop, receiver);
      return typeof value === "function" ? value.bind(get()) : value;
    },
  });
}

export const adminAuth = lazy<Auth>(() => getAuth(app()));
// Banco NOMEADO "default" neste projeto (não o "(default)" padrão).
export const adminDb = lazy<Firestore>(() => getFirestore(app(), "default"));
export const adminBucket = lazy<Bucket>(() => getStorage(app()).bucket());
