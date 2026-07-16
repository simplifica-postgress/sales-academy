import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { AuthError, requireAdmin } from "@/lib/server/adminAuth";
import { adminAuth, adminDb } from "@/lib/server/firebaseAdmin";
import type { UserRole } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Cria uma conta (vendedor ou gestor) a partir do painel do admin. */
export async function POST(req: Request) {
  try {
    await requireAdmin(req);
  } catch (err) {
    const e = err as AuthError;
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }

  const { name, email, password, role } = (await req.json()) as {
    name?: string;
    email?: string;
    password?: string;
    role?: UserRole;
  };

  if (!name?.trim() || !email?.trim() || !password) {
    return NextResponse.json(
      { error: "Informe nome, e-mail e senha." },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: "A senha precisa ter pelo menos 6 caracteres." },
      { status: 400 }
    );
  }
  const finalRole: UserRole = role === "admin" ? "admin" : "seller";

  let uid: string;
  try {
    const created = await adminAuth.createUser({
      email: email.trim(),
      password,
      displayName: name.trim(),
    });
    uid = created.uid;
  } catch (err) {
    const code = (err as { code?: string }).code;
    const message =
      code === "auth/email-already-exists"
        ? "Já existe uma conta com esse e-mail."
        : code === "auth/invalid-email"
          ? "E-mail inválido."
          : "Não foi possível criar a conta.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  await adminDb
    .collection("users")
    .doc(uid)
    .set({
      name: name.trim(),
      email: email.trim(),
      role: finalRole,
      company: "",
      salesRole: finalRole === "admin" ? "Gestor" : "",
      experience: "",
      attendanceTypes: [],
      mainDifficulty: "",
      goal: "",
      trainingStartDate: null,
      currentDay: 0,
      progressPercent: 0,
      averageScore: 0,
      currentLevel: 1,
      // Gestor não passa pelo onboarding; vendedor preenche no 1º acesso.
      profileCompleted: finalRole === "admin",
      createdAt: FieldValue.serverTimestamp(),
    });

  return NextResponse.json({ ok: true, uid, role: finalRole });
}
