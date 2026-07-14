import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/server/firebaseAdmin";
import { analyze, transcribe } from "@/lib/server/openai";
import { computeProgression } from "@/lib/progression";
import {
  ACCEPTED_AUDIO_TYPES,
  ACCEPTED_VIDEO_TYPES,
  IDEAL_SCORE_THRESHOLD,
  MAX_UPLOAD_BYTES,
  TRAINING_TOTAL_DAYS,
} from "@/lib/constants";
import type { UserProfile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Streak atual de dias (mais recente p/ trás) com melhor nota do dia > 85. */
function currentStreak(byDay: Map<string, number>): number {
  const days = [...byDay.keys()].sort(); // ascendente
  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if ((byDay.get(days[i]) ?? 0) > IDEAL_SCORE_THRESHOLD) streak += 1;
    else break;
  }
  return streak;
}

export async function POST(req: Request) {
  // 1. Autenticação: token do Firebase no header Authorization.
  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;
  if (!idToken) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  let uid: string;
  try {
    uid = (await adminAuth.verifyIdToken(idToken)).uid;
  } catch {
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  // 2. Lê o formulário.
  const form = await req.formData();
  const file = form.get("file");
  const attendanceType = String(form.get("attendanceType") ?? "");
  const observation = String(form.get("observation") ?? "");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Arquivo não enviado." },
      { status: 400 }
    );
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Arquivo muito grande (máximo 500 MB)." },
      { status: 400 }
    );
  }
  const isAudio = ACCEPTED_AUDIO_TYPES.includes(file.type);
  const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type);
  if (!isAudio && !isVideo) {
    return NextResponse.json(
      { error: "Formato não suportado. Envie áudio ou vídeo." },
      { status: 400 }
    );
  }

  // 3. Carrega o perfil do vendedor.
  const userRef = adminDb.collection("users").doc(uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    return NextResponse.json(
      { error: "Perfil não encontrado." },
      { status: 404 }
    );
  }
  const profile = userSnap.data() as UserProfile;

  const start = profile.trainingStartDate as Timestamp | null;
  const trainingDay = start
    ? Math.min(
        Math.max(
          Math.floor((Date.now() - start.toDate().getTime()) / 86_400_000) + 1,
          1
        ),
        TRAINING_TOTAL_DAYS
      )
    : 1;

  // 4. Registra o upload como "processing".
  const uploadRef = adminDb.collection("uploads").doc();
  await uploadRef.set({
    userId: uid,
    fileUrl: "",
    filePath: "",
    fileType: isVideo ? "video" : "audio",
    mimeType: file.type,
    status: "processing",
    trainingDay,
    attendanceType,
    observation,
    createdAt: FieldValue.serverTimestamp(),
  });

  try {
    // 5. Transcreve e analisa.
    const buffer = Buffer.from(await file.arrayBuffer());
    const transcript = await transcribe(buffer, file.name);
    if (!transcript || transcript.length < 20) {
      throw new Error(
        "Não foi possível entender o áudio. Verifique a gravação e tente de novo."
      );
    }
    const { result, generalScore } = await analyze(
      profile,
      trainingDay,
      observation,
      transcript
    );

    // 6. Salva a análise.
    const analysisRef = adminDb.collection("analyses").doc();
    await analysisRef.set({
      userId: uid,
      uploadId: uploadRef.id,
      transcript,
      summary: result.summary,
      strengths: result.strengths,
      mistakes: result.mistakes,
      improvements: result.improvements,
      criteriaScores: result.criteriaScores,
      generalScore,
      nextMission: result.nextMission,
      trainingDay,
      createdAt: FieldValue.serverTimestamp(),
    });
    await uploadRef.update({ status: "done" });

    // 7. Recalcula progresso a partir de todo o histórico.
    const [uploadsSnap, analysesSnap] = await Promise.all([
      adminDb.collection("uploads").where("userId", "==", uid).get(),
      adminDb.collection("analyses").where("userId", "==", uid).get(),
    ]);

    const uploadDays = new Set<string>();
    uploadsSnap.forEach((d) => {
      const ts = d.get("createdAt") as Timestamp | null;
      if (ts) uploadDays.add(dayKey(ts.toDate()));
    });

    const analyses = analysesSnap.docs
      .map((d) => ({
        score: d.get("generalScore") as number,
        createdAt: d.get("createdAt") as Timestamp | null,
      }))
      .filter((a) => a.createdAt)
      .sort(
        (a, b) => a.createdAt!.toMillis() - b.createdAt!.toMillis()
      );

    const bestByDay = new Map<string, number>();
    for (const a of analyses) {
      const key = dayKey(a.createdAt!.toDate());
      bestByDay.set(key, Math.max(bestByDay.get(key) ?? 0, a.score));
    }

    const progression = computeProgression({
      scores: analyses.map((a) => a.score),
      distinctUploadDays: uploadDays.size,
      highScoreStreak: currentStreak(bestByDay),
    });

    await adminDb.collection("progress").doc(uid).set(
      {
        totalUploads: uploadsSnap.size,
        completedDays: uploadDays.size,
        currentLevel: progression.currentLevel,
        bestScore: progression.bestScore,
        averageScore: progression.averageScore,
        idealAttendanceReached: progression.idealAttendanceReached,
        highScoreStreak: progression.highScoreStreak,
        lastAnalysisDate: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    await userRef.update({
      currentDay: trainingDay,
      progressPercent: progression.progressPercent,
      averageScore: progression.averageScore,
      currentLevel: progression.currentLevel,
    });

    return NextResponse.json({ analysisId: analysisRef.id, generalScore });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha ao processar o atendimento.";
    await uploadRef.update({ status: "error", errorMessage: message });
    console.error("Erro no pipeline de análise:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
