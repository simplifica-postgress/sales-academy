import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/server/firebaseAdmin";
import { ATTENDANCE_TYPES } from "@/lib/constants";
import type { AttendanceType } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID_TYPES = ATTENDANCE_TYPES.map((t) => t.value) as string[];

/**
 * Conclui o cadastro do vendedor.
 *
 * Fica no backend de propósito: as Rules impedem o cliente de escrever
 * qualquer campo que reflita avaliação/progresso (progressPercent, nível,
 * currentDay, trainingStartDate). Só o servidor inicia o treinamento.
 */
export async function POST(req: Request) {
  const header = req.headers.get("authorization") ?? "";
  const idToken = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let uid: string;
  let email: string | null = null;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
    email = decoded.email ?? null;
  } catch {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  const body = (await req.json()) as {
    name?: string;
    company?: string;
    salesRole?: string;
    experience?: string;
    attendanceTypes?: string[];
    mainDifficulty?: string;
    goal?: string;
  };

  const name = (body.name ?? "").trim();
  const company = (body.company ?? "").trim();
  const salesRole = (body.salesRole ?? "").trim();
  const experience = (body.experience ?? "").trim();
  const mainDifficulty = (body.mainDifficulty ?? "").trim();
  const goal = (body.goal ?? "").trim();
  const attendanceTypes = (body.attendanceTypes ?? []).filter((t) =>
    VALID_TYPES.includes(t)
  ) as AttendanceType[];

  if (!name || !company || !salesRole || !experience) {
    return NextResponse.json(
      { error: "Preencha nome, empresa, cargo e experiência." },
      { status: 400 }
    );
  }
  if (attendanceTypes.length === 0) {
    return NextResponse.json(
      { error: "Selecione pelo menos um tipo de atendimento." },
      { status: 400 }
    );
  }
  if (!mainDifficulty || !goal) {
    return NextResponse.json(
      { error: "Preencha a dificuldade principal e o objetivo." },
      { status: 400 }
    );
  }

  const userRef = adminDb.collection("users").doc(uid);
  const snap = await userRef.get();
  const alreadyCompleted = snap.exists && snap.get("profileCompleted") === true;

  const profileFields = {
    name,
    company,
    salesRole,
    experience,
    attendanceTypes,
    mainDifficulty,
    goal,
  };

  if (alreadyCompleted) {
    // Reedição do perfil: não reinicia o treinamento.
    await userRef.update(profileFields);
    return NextResponse.json({ ok: true, restarted: false });
  }

  await userRef.set(
    {
      ...profileFields,
      email: email ?? snap.get("email") ?? "",
      role: "seller",
      profileCompleted: true,
      trainingStartDate: FieldValue.serverTimestamp(),
      currentDay: 1,
      progressPercent: 0,
      averageScore: 0,
      currentLevel: 1,
      createdAt: snap.exists
        ? (snap.get("createdAt") ?? FieldValue.serverTimestamp())
        : FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  await adminDb.collection("progress").doc(uid).set({
    totalUploads: 0,
    completedDays: 0,
    currentLevel: 1,
    bestScore: 0,
    averageScore: 0,
    idealAttendanceReached: false,
    sendStreak: 0,
    highScoreStreak: 0,
    lastAnalysisDate: null,
  });

  return NextResponse.json({ ok: true, restarted: true });
}
