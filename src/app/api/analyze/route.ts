import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminBucket, adminDb } from "@/lib/server/firebaseAdmin";
import { analyze, transcribe } from "@/lib/server/openai";
import { computeProgression } from "@/lib/progression";
import {
  ACCEPTED_AUDIO_TYPES,
  ACCEPTED_VIDEO_TYPES,
  CONSENT_VERSION,
  IDEAL_SCORE_THRESHOLD,
  MAX_UPLOAD_BYTES,
} from "@/lib/constants";
import type { UserProfile } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Agrupa por dia no mesmo fuso do cliente (America/Sao_Paulo) para que
// "enviou hoje" e a contagem de dias/sequência sejam consistentes.
function dayKey(d: Date): string {
  return d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
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

/**
 * Sequência de dias seguidos com envio (hábito). Só está "viva" se o último
 * envio foi hoje ou ontem — do contrário a sequência foi quebrada e volta a 0.
 */
function sendStreakFrom(dayKeys: Set<string>): number {
  if (dayKeys.size === 0) return 0;
  const DAY_MS = 86_400_000;
  const today = dayKey(new Date());
  const yesterday = dayKey(new Date(Date.now() - DAY_MS));
  let cursor: Date;
  if (dayKeys.has(today)) cursor = new Date();
  else if (dayKeys.has(yesterday)) cursor = new Date(Date.now() - DAY_MS);
  else return 0; // último envio há mais de um dia → sequência quebrada
  let streak = 0;
  while (dayKeys.has(dayKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - DAY_MS);
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
  } catch (err) {
    // Sem log, um erro de configuração do servidor fica disfarçado de
    // "sessão inválida" e não há como diagnosticar.
    console.error("Falha ao verificar o token:", err);
    return NextResponse.json({ error: "Sessão inválida." }, { status: 401 });
  }

  // 2. Lê o pedido: o arquivo já está no Storage, recebemos o caminho.
  const body = (await req.json()) as {
    filePath?: string;
    attendanceType?: string;
    observation?: string;
    consent?: boolean;
  };
  const filePath = (body.filePath ?? "").trim();
  const attendanceType = body.attendanceType ?? "";
  const observation = body.observation ?? "";

  if (!filePath) {
    return NextResponse.json({ error: "Arquivo não enviado." }, { status: 400 });
  }
  // Consentimento é obrigatório e fica registrado no envio (LGPD).
  if (body.consent !== true) {
    return NextResponse.json(
      { error: "É preciso aceitar o termo de consentimento para enviar." },
      { status: 400 }
    );
  }
  // O caminho precisa ser da pasta do próprio vendedor (anti-adulteração).
  if (!filePath.startsWith(`uploads/${uid}/`)) {
    return NextResponse.json(
      { error: "Caminho de arquivo inválido." },
      { status: 403 }
    );
  }

  const storageFile = adminBucket.file(filePath);
  const [exists] = await storageFile.exists();
  if (!exists) {
    return NextResponse.json(
      { error: "Arquivo não encontrado no Storage." },
      { status: 404 }
    );
  }

  const [meta] = await storageFile.getMetadata();
  const mimeType = meta.contentType ?? "";
  const size = Number(meta.size ?? 0);

  if (size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      { error: "Arquivo muito grande (máximo 500 MB)." },
      { status: 400 }
    );
  }
  const isAudio = ACCEPTED_AUDIO_TYPES.includes(mimeType);
  const isVideo = ACCEPTED_VIDEO_TYPES.includes(mimeType);
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

  // Dia de prática (dias desde o início do uso), sem teto: a ferramenta é
  // usada quando o vendedor precisa, não há prazo fixo de 30 dias.
  const start = profile.trainingStartDate as Timestamp | null;
  const trainingDay = start
    ? Math.max(
        Math.floor((Date.now() - start.toDate().getTime()) / 86_400_000) + 1,
        1
      )
    : 1;

  // 4. Registra o upload como "processing", já apontando para o arquivo.
  const uploadRef = adminDb.collection("uploads").doc();
  await uploadRef.set({
    userId: uid,
    fileUrl: "",
    filePath,
    fileType: isVideo ? "video" : "audio",
    mimeType,
    fileSize: size,
    status: "processing",
    trainingDay,
    attendanceType,
    observation,
    // Trilha de consentimento: qual termo foi aceito e quando.
    consentVersion: CONSENT_VERSION,
    consentAt: FieldValue.serverTimestamp(),
    fileDeleted: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  try {
    // 5. Baixa do Storage, transcreve e analisa.
    const [buffer] = await storageFile.download();
    const transcript = await transcribe(
      buffer,
      filePath.split("/").pop() ?? "audio",
      mimeType
    );
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

    const analyses = analysesSnap.docs
      .map((d) => ({
        score: d.get("generalScore") as number,
        createdAt: d.get("createdAt") as Timestamp | null,
      }))
      .filter((a) => a.createdAt)
      .sort(
        (a, b) => a.createdAt!.toMillis() - b.createdAt!.toMillis()
      );

    // Dias de treino contam pelas ANÁLISES, não pelos uploads: só existe
    // análise quando o pipeline deu certo. Se contássemos uploads, um envio
    // que falhou (arquivo mudo, corrompido) valeria dia — daria para farmar
    // os dias exigidos pelo nível e manter a sequência sem treinar nada.
    const analysisDays = new Set<string>();
    for (const a of analyses) analysisDays.add(dayKey(a.createdAt!.toDate()));

    const bestByDay = new Map<string, number>();
    for (const a of analyses) {
      const key = dayKey(a.createdAt!.toDate());
      bestByDay.set(key, Math.max(bestByDay.get(key) ?? 0, a.score));
    }

    const progression = computeProgression({
      scores: analyses.map((a) => a.score),
      completedDays: analysisDays.size,
      sendStreak: sendStreakFrom(analysisDays),
      highScoreStreak: currentStreak(bestByDay),
    });

    await adminDb.collection("progress").doc(uid).set(
      {
        totalUploads: uploadsSnap.size,
        completedDays: analysisDays.size,
        currentLevel: progression.currentLevel,
        bestScore: progression.bestScore,
        averageScore: progression.averageScore,
        idealAttendanceReached: progression.idealAttendanceReached,
        sendStreak: progression.sendStreak,
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
