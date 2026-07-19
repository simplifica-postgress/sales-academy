import {
  IDEAL_SCORE_THRESHOLD,
  IDEAL_STREAK_REQUIRED,
  idealProgress,
} from "./constants";

export interface ProgressionInput {
  /** Todas as notas gerais do vendedor, da mais antiga para a mais recente. */
  scores: number[];
  /** Sequência atual de dias seguidos com envio (hábito). */
  sendStreak: number;
  /** Sequência atual de dias com melhor nota > 85 (para o nível ideal). */
  highScoreStreak: number;
}

export interface ProgressionResult {
  /** Progresso até o atendimento ideal: quão perto a média está da meta (85). */
  progressPercent: number;
  averageScore: number;
  bestScore: number;
  currentLevel: number;
  idealAttendanceReached: boolean;
  sendStreak: number;
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
 * Recalcula o progresso do vendedor. Sem prazo fixo (a ferramenta é usada
 * quando o vendedor precisa): o progresso mede QUALIDADE — quão perto a média
 * está do atendimento ideal (meta 85). Nível 5 exige atendimento ideal
 * (nota > 85 por 3 dias seguidos). Hábito (dias e sequência de envios) é
 * acompanhado à parte, sem afetar a nota.
 */
export function computeProgression(input: ProgressionInput): ProgressionResult {
  const { scores, sendStreak, highScoreStreak } = input;

  const averageScore = Math.round(mean(scores));
  const bestScore = scores.length ? Math.round(Math.max(...scores)) : 0;

  // Barra "rumo ao atendimento ideal": média ÷ meta (85), teto de 100%.
  const progressPercent = idealProgress(averageScore);

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
    sendStreak,
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
