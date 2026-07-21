import type { AttendanceType, CriterionKey } from "./types";

// ---------- Treinamento ----------

/** Nota mínima para contar como "atendimento ideal". */
export const IDEAL_SCORE_THRESHOLD = 85;

/**
 * Meta de nota por semana de treino. É uma escada: quem está começando mira
 * 20, não 85. Olhar para 85 no primeiro dia desanima; bater 20 e depois 30 dá
 * a sensação de avanço real. A última faixa é o atendimento ideal (85), e a
 * meta para de subir aí.
 */
export const WEEKLY_GOALS = [20, 30, 40, 50, 60, 70, 80, IDEAL_SCORE_THRESHOLD];

/** Semana de treino (1-based) a partir dos dias já enviados. */
export function trainingWeek(daysActive: number): number {
  if (daysActive <= 0) return 1;
  return Math.floor((daysActive - 1) / 5) + 1;
}

/**
 * Meta da semana atual. Sobe conforme o vendedor acumula dias de treino
 * (a cada 5 dias enviados), não conforme o calendário: quem usa a ferramenta
 * de vez em quando não é punido com uma meta que correu sem ele.
 */
export function weeklyGoal(daysActive: number): number {
  const week = trainingWeek(daysActive);
  return WEEKLY_GOALS[Math.min(week, WEEKLY_GOALS.length) - 1];
}

/** Progresso rumo à meta da semana (0–100). */
export function goalProgress(averageScore: number, daysActive: number): number {
  if (!averageScore) return 0;
  return Math.min(Math.round((averageScore / weeklyGoal(daysActive)) * 100), 100);
}

/** Dias seguidos acima do threshold para atingir o nível 5. */
export const IDEAL_STREAK_REQUIRED = 3;

/**
 * Progresso até o atendimento ideal: quão perto a média (0–100) está da meta
 * (85), com teto de 100%. Fonte única usada no backend e nas telas, para a
 * barra sempre bater com a média exibida.
 */
export function idealProgress(averageScore: number): number {
  if (!averageScore) return 0;
  return Math.min(Math.round((averageScore / IDEAL_SCORE_THRESHOLD) * 100), 100);
}

// ---------- Critérios de avaliação (pesos somam 100) ----------

export const CRITERIA: {
  key: CriterionKey;
  label: string;
  weight: number;
}[] = [
  { key: "abertura", label: "Abertura e postura inicial", weight: 10 },
  { key: "clareza", label: "Clareza na comunicação", weight: 10 },
  { key: "diagnostico", label: "Diagnóstico do cenário", weight: 20 },
  { key: "dor", label: "Identificação da dor/problema", weight: 15 },
  { key: "valor", label: "Geração de valor", weight: 15 },
  { key: "objecoes", label: "Tratamento de objeções", weight: 10 },
  { key: "proximoPasso", label: "Condução do próximo passo", weight: 10 },
  { key: "fechamento", label: "Fechamento / CTA", weight: 10 },
];

/** Média ponderada das notas por critério (0–100). */
export function weightedGeneralScore(
  scores: Partial<Record<CriterionKey, number>>
): number {
  const total = CRITERIA.reduce(
    (sum, c) => sum + (scores[c.key] ?? 0) * c.weight,
    0
  );
  return Math.round(total / 100);
}

// ---------- Níveis de progressão ----------

export const LEVELS = [
  {
    level: 1,
    name: "Iniciante",
    description: "Enviou os primeiros atendimentos e recebeu diagnóstico.",
  },
  {
    level: 2,
    name: "Em desenvolvimento",
    description: "Começou a melhorar abordagem e clareza.",
  },
  {
    level: 3,
    name: "Consultivo",
    description: "Faz boas perguntas e entende melhor a dor do lead.",
  },
  {
    level: 4,
    name: "Estratégico",
    description: "Conduz objeções e próximo passo com mais segurança.",
  },
  {
    level: 5,
    name: "Atendimento ideal",
    description: "Mantém nota alta e atendimento consistente.",
  },
] as const;


// ---------- Tipos de atendimento ----------

export const ATTENDANCE_TYPES: { value: AttendanceType; label: string }[] = [
  { value: "ligacao", label: "Ligação" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "presencial", label: "Presencial" },
  { value: "reuniao", label: "Reunião" },
  { value: "sdr", label: "SDR" },
  { value: "closer", label: "Closer" },
];

// ---------- Upload ----------

export const ACCEPTED_AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/x-m4a",
  "audio/wav",
  "audio/ogg",
  "audio/webm",
];

export const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/webm",
];

/** Limite de upload (500 MB) — vídeos de reunião podem ser grandes. */
export const MAX_UPLOAD_BYTES = 500 * 1024 * 1024;

// ---------- Consentimento (LGPD) ----------

/**
 * Versão do termo aceito no envio. Ao mudar o texto, incremente a versão:
 * cada envio guarda a versão que o vendedor aceitou, o que dá à Simplifica
 * uma trilha de prova de qual termo estava valendo naquele dia.
 */
export const CONSENT_VERSION = "1.0";

/**
 * Retenção das gravações, em dias (LGPD: finalidade e necessidade).
 * A gravação existe para gerar a análise; cumprida essa finalidade, ela é
 * descartada. A análise (nota, transcrição, missão) permanece para sempre.
 *
 * Configurável sem mexer no código via NEXT_PUBLIC_RETENTION_DAYS no .env
 * (público de propósito: o vendedor precisa ver o prazo no termo).
 */
export const RETENTION_DAYS = Number(
  process.env.NEXT_PUBLIC_RETENTION_DAYS ?? 60
);

/** Termo exibido (e registrado) a cada envio de atendimento. */
export const CONSENT_TEXT =
  `Declaro que este atendimento foi gravado de forma lícita e que tenho autorização para compartilhá-lo com a Simplifica para fins de treinamento comercial. Estou ciente de que o arquivo será armazenado em servidor seguro, processado por inteligência artificial para gerar a análise, ficará acessível ao meu gestor e será excluído automaticamente após ${RETENTION_DAYS} dias.`;
