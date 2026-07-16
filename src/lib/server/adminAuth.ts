import "server-only";
import { adminAuth, adminDb } from "./firebaseAdmin";

export interface AdminCaller {
  uid: string;
  email: string | null;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/**
 * Valida o token do Firebase no header Authorization e exige papel de admin.
 * Lança AuthError (401/403) quando não autorizado.
 */
export async function requireAdmin(req: Request): Promise<AdminCaller> {
  const header = req.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!idToken) throw new AuthError("Não autenticado.", 401);

  let uid: string;
  let email: string | null = null;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
    email = decoded.email ?? null;
  } catch {
    throw new AuthError("Sessão inválida.", 401);
  }

  const snap = await adminDb.collection("users").doc(uid).get();
  if (!snap.exists || snap.get("role") !== "admin") {
    throw new AuthError("Acesso restrito a gestores.", 403);
  }

  return { uid, email };
}
