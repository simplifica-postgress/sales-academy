import type { AttendanceType, CriterionKey } from "./types";

// ---------- Treinamento ----------

export const TRAINING_TOTAL_DAYS = 30;

/** Nota mínima para contar como "atendimento ideal". */
export const IDEAL_SCORE_THRESHOLD = 85;

/** Dias seguidos acima do threshold para atingir o nível 5. */
export const IDEAL_STREAK_REQUIRED = 3;

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

// ---------- Jornada de 30 dias (fases semanais) ----------

export const TRAINING_WEEKS = [
  {
    week: 1,
    days: [1, 7],
    name: "Diagnóstico e base",
    focus:
      "Criar hábito de envio diário; avaliar clareza, abordagem e escuta.",
  },
  {
    week: 2,
    days: [8, 14],
    name: "Diagnóstico comercial",
    focus:
      "Fazer perguntas melhores, entender a dor, não apresentar solução cedo demais.",
  },
  {
    week: 3,
    days: [15, 21],
    name: "Objeções e condução",
    focus:
      "Lidar com 'vou pensar', preço e demora; conduzir sem pressionar; próximo passo claro.",
  },
  {
    week: 4,
    days: [22, 30],
    name: "Atendimento ideal",
    focus:
      "Manter nota alta, reduzir erros repetidos, consistência final.",
  },
] as const;

/** Retorna a fase semanal correspondente ao dia do treinamento (1–30). */
export function weekForDay(day: number) {
  return (
    TRAINING_WEEKS.find((w) => day >= w.days[0] && day <= w.days[1]) ??
    TRAINING_WEEKS[TRAINING_WEEKS.length - 1]
  );
}

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

/** Termo exibido (e registrado) a cada envio de atendimento. */
export const CONSENT_TEXT =
  "Declaro que este atendimento foi gravado de forma lícita e que tenho autorização para compartilhá-lo com a Simplifica para fins de treinamento comercial. Estou ciente de que o arquivo será armazenado em servidor seguro, processado por inteligência artificial para gerar a análise e ficará acessível ao meu gestor.";
