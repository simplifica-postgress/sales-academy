import { NextResponse } from "next/server";
import { AuthError, requireAdmin } from "@/lib/server/adminAuth";
import { adminDb } from "@/lib/server/firebaseAdmin";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Promove/rebaixa um usuário (seller <-> admin).
 * O papel só pode ser alterado por aqui: as Rules do Firestore impedem que o
 * cliente mude o próprio papel (anti-escalada de privilégio).
 */
export async function POST(req: Request) {
  let caller;
  try {
    caller = await requireAdmin(req);
  } catch (err) {
    const e = err as AuthError;
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const { uid, role } = (await req.json()) as { uid?: string; role?: UserRole };

  if (!uid || (role !== "admin" && role !== "seller")) {
    return NextResponse.json(
      { error: "Informe uid e role ('admin' ou 'seller')." },
      { status: 400 }
    );
  }

  // Um gestor não pode rebaixar a si mesmo (evita ficar sem nenhum admin).
  if (uid === caller.uid && role !== "admin") {
    return NextResponse.json(
      { error: "Você não pode remover o seu próprio acesso de gestor." },
      { status: 400 }
    );
  }

  const ref = adminDb.collection("users").doc(uid);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json(
      { error: "Usuário não encontrado." },
      { status: 404 }
    );
  }

  // Ao virar admin, o onboarding de vendedor deixa de ser exigido.
  const patch: Record<string, unknown> = { role };
  if (role === "admin") patch.profileCompleted = true;

  await ref.update(patch);

  return NextResponse.json({ ok: true, uid, role });
}
