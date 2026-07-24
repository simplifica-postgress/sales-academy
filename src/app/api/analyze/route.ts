import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminBucket, adminDb } from "@/lib/server/firebaseAdmin";
import { analyze, transcribe, transcribeImages } from "@/lib/server/openai";
import { computeProgression } from "@/lib/progression";
import {
  ACCEPTED_AUDIO_TYPES,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  CONSENT_VERSION,
  IDEAL_SCORE_THRESHOLD,
  MAX_IMAGES_PER_SUBMISSION,
  MAX_IMAGE_BYTES,
  MAX_UPLOAD_BYTES,
  type AttendanceMedium,
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
    imagePaths?: string[];
    pastedText?: string;
    attendanceType?: string;
    observation?: string;
    consent?: boolean;
  };
  const filePath = (body.filePath ?? "").trim();
  const attendanceType = body.attendanceType ?? "";
  const observation = body.observation ?? "";

  // Consentimento é obrigatório e fica registrado no envio (LGPD).
  if (body.consent !== true) {
    return NextResponse.json(
      { error: "É preciso aceitar o termo de consentimento para enviar." },
      { status: 400 }
    );
  }

  // Três formas de enviar um atendimento:
  //  - arquivo de áudio/vídeo (filePath)  → transcrição por Whisper
  //  - prints da conversa (imagePaths)    → leitura por visão do modelo
  //  - transcrição colada (pastedText)    → usada direto
  const pastedText = (body.pastedText ?? "").trim();
  const imagePaths = Array.isArray(body.imagePaths) ? body.imagePaths : [];
  const formas = [filePath ? 1 : 0, imagePaths.length ? 1 : 0, pastedText ? 1 : 0].reduce((a, b) => a + b, 0);
  if (formas === 0) {
    return NextResponse.json(
      { error: "Envie um áudio/vídeo, prints da conversa ou cole a conversa." },
      { status: 400 }
    );
  }
  if (formas > 1) {
    return NextResponse.json(
      { error: "Envie um formato por vez." },
      { status: 400 }
    );
  }

  // Todo caminho precisa ser da pasta do próprio vendedor (anti-adulteração).
  const todosCaminhos = filePath ? [filePath] : imagePaths;
  for (const p of todosCaminhos) {
    if (!p.startsWith(`uploads/${uid}/`)) {
      return NextResponse.json(
        { error: "Caminho de arquivo inválido." },
        { status: 403 }
      );
    }
  }
  if (imagePaths.length > MAX_IMAGES_PER_SUBMISSION) {
    return NextResponse.json(
      { error: `No máximo ${MAX_IMAGES_PER_SUBMISSION} prints por envio.` },
      { status: 400 }
    );
  }

  let mimeType = "";
  let size = 0;
  let storageFile: ReturnType<typeof adminBucket.file> | null = null;

  if (filePath) {
    storageFile = adminBucket.file(filePath);
    const [exists] = await storageFile.exists();
    if (!exists) {
      return NextResponse.json(
        { error: "Arquivo não encontrado no Storage." },
        { status: 404 }
      );
    }
    const [meta] = await storageFile.getMetadata();
    mimeType = meta.contentType ?? "";
    size = Number(meta.size ?? 0);

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
  }

  // Conversa escrita (prints ou texto colado) muda como a IA avalia.
  const medium: AttendanceMedium = filePath ? "audio" : "texto";
  const fileType: "audio" | "video" | "texto" | "print" = filePath
    ? ACCEPTED_VIDEO_TYPES.includes(mimeType)
      ? "video"
      : "audio"
    : imagePaths.length
      ? "print"
      : "texto";

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
  // Cópia da empresa do vendedor: é por ela que as regras deixam o gestor
  // ler os documentos da própria equipe (o Firestore não faz join).
  const companyId = (profile.companyId as string | null) ?? null;

  const uploadRef = adminDb.collection("uploads").doc();
  await uploadRef.set({
    userId: uid,
    companyId,
    fileUrl: "",
    filePath: filePath || (imagePaths[0] ?? ""),
    imageCount: imagePaths.length || undefined,
    fileType,
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
    // 5. Obtém a transcrição conforme o formato enviado.
    let transcript: string;
    if (storageFile && filePath) {
      const [buffer] = await storageFile.download();
      transcript = await transcribe(
        buffer,
        filePath.split("/").pop() ?? "audio",
        mimeType
      );
      if (!transcript || transcript.length < 20) {
        throw new Error(
          "Não foi possível entender o áudio. Verifique a gravação e tente de novo."
        );
      }
    } else if (imagePaths.length) {
      // Baixa os prints NA ORDEM enviada — a sequência é o fio da conversa.
      const imagens: { data: Buffer; mimeType: string }[] = [];
      for (const p of imagePaths) {
        const f = adminBucket.file(p);
        const [existe] = await f.exists();
        if (!existe) throw new Error("Um dos prints não foi encontrado.");
        const [m] = await f.getMetadata();
        const tipo = m.contentType ?? "";
        if (!ACCEPTED_IMAGE_TYPES.includes(tipo)) {
          throw new Error("Envie prints em PNG, JPG ou WEBP.");
        }
        if (Number(m.size ?? 0) > MAX_IMAGE_BYTES) {
          throw new Error("Um dos prints é grande demais.");
        }
        const [buf] = await f.download();
        imagens.push({ data: buf, mimeType: tipo });
      }
      transcript = await transcribeImages(imagens);
      if (!transcript || transcript.length < 20) {
        throw new Error(
          "Não consegui ler a conversa nos prints. Tente imagens mais nítidas ou cole o texto."
        );
      }
    } else {
      transcript = pastedText;
      if (transcript.length < 20) {
        throw new Error("Cole uma conversa com pelo menos 20 caracteres.");
      }
    }

    const { result, generalScore } = await analyze(
      profile,
      trainingDay,
      observation,
      transcript,
      medium
    );

    // 6. Salva a análise.
    const analysisRef = adminDb.collection("analyses").doc();
    await analysisRef.set({
      userId: uid,
      companyId,
      uploadId: uploadRef.id,
      transcript,
      summary: result.summary,
      strengths: result.strengths,
      mistakes: result.mistakes,
      improvements: result.improvements,
      criteriaScores: result.criteriaScores,
      generalScore,
      missionFocus: result.missionFocus ?? null,
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

    // UMA NOTA POR DIA: vale a PRIMEIRA análise do dia. Enviar mais
    // atendimentos no mesmo dia continua gerando análise e feedback completo,
    // mas não mexe na média nem na barra. Sem isso, o vendedor empurra o
    // progresso numa tarde só, em vez de evoluir ao longo dos dias.
    //
    // Os dias saem das ANÁLISES (não dos uploads) porque só existe análise
    // quando o pipeline deu certo: um envio que falhou (arquivo mudo ou
    // corrompido) não pode valer dia de treino nem segurar a sequência.
    const officialByDay = new Map<string, number>();
    for (const a of analyses) {
      const key = dayKey(a.createdAt!.toDate());
      if (!officialByDay.has(key)) officialByDay.set(key, a.score);
    }
    const trainedDays = [...officialByDay.keys()].sort();

    const progression = computeProgression({
      scores: trainedDays.map((k) => officialByDay.get(k)!),
      completedDays: trainedDays.length,
      sendStreak: sendStreakFrom(new Set(trainedDays)),
      highScoreStreak: currentStreak(officialByDay),
    });

    await adminDb.collection("progress").doc(uid).set(
      {
        companyId,
        totalUploads: uploadsSnap.size,
        completedDays: trainedDays.length,
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
