import "server-only";
import { adminAuth, adminDb } from "./firebaseAdmin";
import type { UserRole } from "@/lib/types";

export interface Caller {
  uid: string;
  email: string | null;
  role: UserRole;
  companyId: string | null;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/** Valida o token do Firebase e devolve quem está chamando. */
async function authenticate(req: Request): Promise<Caller> {
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
  if (!snap.exists) throw new AuthError("Perfil não encontrado.", 403);

  return {
    uid,
    email,
    role: (snap.get("role") as UserRole) ?? "seller",
    companyId: (snap.get("companyId") as string | null) ?? null,
  };
}

/** Exige que quem chama tenha um dos papéis informados. */
export async function requireRole(
  req: Request,
  roles: UserRole[]
): Promise<Caller> {
  const caller = await authenticate(req);
  if (!roles.includes(caller.role)) {
    throw new AuthError("Acesso restrito.", 403);
  }
  return caller;
}

/** Só a Simplifica: mexe em empresas, papéis e contas. */
export function requireMaster(req: Request): Promise<Caller> {
  return requireRole(req, ["master"]);
}

/** Gestor da empresa ou master (ver equipe, testar IA). */
export function requireStaff(req: Request): Promise<Caller> {
  return requireRole(req, ["manager", "master"]);
}

/**
 * Garante que quem chama pode agir sobre um vendedor específico.
 * O master pode tudo; o gestor, apenas dentro da própria empresa.
 * Devolve o doc do alvo para quem chamou não precisar buscar de novo.
 */
export async function requireAccessToUser(caller: Caller, targetUid: string) {
  const snap = await adminDb.collection("users").doc(targetUid).get();
  if (!snap.exists) throw new AuthError("Vendedor não encontrado.", 404);

  if (caller.role === "master") return snap;

  const targetCompany = (snap.get("companyId") as string | null) ?? null;
  const sameCompany =
    caller.role === "manager" &&
    caller.companyId !== null &&
    caller.companyId === targetCompany;

  if (!sameCompany) throw new AuthError("Acesso restrito.", 403);
  return snap;
}
