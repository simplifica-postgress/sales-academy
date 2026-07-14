import {
  IDEAL_SCORE_THRESHOLD,
  IDEAL_STREAK_REQUIRED,
  TRAINING_TOTAL_DAYS,
} from "./constants";

export interface ProgressionInput {
  /** Todas as notas gerais do vendedor, da mais antiga para a mais recente. */
  scores: number[];
  /** Chaves de dia distintas em que houve envio (ex.: "2026-07-14"). */
  distinctUploadDays: number;
  /** Sequência atual de notas > 85 (calculada por dia). */
  highScoreStreak: number;
}

export interface ProgressionResult {
  progressPercent: number;
  averageScore: number;
  bestScore: number;
  currentLevel: number;
  idealAttendanceReached: boolean;
  highScoreStreak: number;
}

const LEVEL_THRESHOLDS = [
  { level: 4, minAverage: 80 },
  { level: 3, minAverage: 70 },
  { level: 2, minAverage: 60 },
] as const;

/** Média aritmética simples (0 se vazio). */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Recalcula o progresso do vendedor combinando consistência (envios diários)
 * e qualidade (média das notas). Regra do escopo: barra avança 50% por
 * consistência + 50% por qualidade; nível 5 exige atendimento ideal
 * (nota > 85 por 3 dias seguidos).
 */
export function computeProgression(input: ProgressionInput): ProgressionResult {
  const { scores, distinctUploadDays, highScoreStreak } = input;

  const averageScore = Math.round(mean(scores));
  const bestScore = scores.length ? Math.round(Math.max(...scores)) : 0;

  const consistency = Math.min(distinctUploadDays / TRAINING_TOTAL_DAYS, 1);
  const quality = Math.min(mean(scores) / 100, 1);
  const progressPercent = Math.round((0.5 * consistency + 0.5 * quality) * 100);

  const idealAttendanceReached = highScoreStreak >= IDEAL_STREAK_REQUIRED;

  let currentLevel = 1;
  if (idealAttendanceReached) {
    currentLevel = 5;
  } else {
    for (const t of LEVEL_THRESHOLDS) {
      if (averageScore >= t.minAverage) {
        currentLevel = t.level;
        break;
      }
    }
  }

  return {
    progressPercent,
    averageScore,
    bestScore,
    currentLevel,
    idealAttendanceReached,
    highScoreStreak,
  };
}

/**
 * Atualiza a sequência de "notas altas" quando um novo dia recebe sua
 * primeira nota. Só conta uma vez por dia (a maior do dia).
 */
export function nextHighScoreStreak(
  currentStreak: number,
  dayBestScore: number
): number {
  return dayBestScore > IDEAL_SCORE_THRESHOLD ? currentStreak + 1 : 0;
}
