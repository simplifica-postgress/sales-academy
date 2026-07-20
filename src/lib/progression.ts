import { IDEAL_STREAK_REQUIRED, idealProgress } from "./constants";

/**
 * Quantos DIAS recentes entram na média (cada dia vale uma nota — a do
 * primeiro atendimento do dia). A média mede o nível ATUAL do vendedor, não o
 * histórico: um bom atendimento antigo não sustenta a nota para sempre, e
 * quem evolui vê a média subir de verdade.
 */
export const RECENT_WINDOW = 5;

export interface ProgressionInput {
  /** Todas as notas gerais do vendedor, da mais antiga para a mais recente. */
  scores: number[];
  /** Dias distintos em que houve envio (prova de consistência). */
  completedDays: number;
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

/**
 * Regras de nível: média E volume. O volume existe porque nível é reputação —
 * um único atendimento bom é um bom dia, não é nível. Sem essa trava, quem
 * mandasse um atendimento nota 80 virava "Estratégico" na hora.
 * Da mais alta para a mais baixa (a primeira que bate vence).
 */
const LEVEL_RULES = [
  { level: 5, minAverage: 0, minDays: 20, requiresIdeal: true },
  { level: 4, minAverage: 80, minDays: 15, requiresIdeal: false },
  { level: 3, minAverage: 70, minDays: 10, requiresIdeal: false },
  { level: 2, minAverage: 60, minDays: 5, requiresIdeal: false },
] as const;

/** Média aritmética simples (0 se vazio). */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/**
 * Recalcula o progresso do vendedor. Sem prazo fixo (a ferramenta é usada
 * quando o vendedor precisa): o progresso mede QUALIDADE — quão perto a média
 * dos últimos envios está do atendimento ideal (meta 85). O NÍVEL exige média
 * E dias enviados, para não virar "Estratégico" com um bom atendimento só.
 * Hábito (dias e sequência de envios) é acompanhado à parte.
 */
export function computeProgression(input: ProgressionInput): ProgressionResult {
  const { scores, completedDays, sendStreak, highScoreStreak } = input;

  // Média dos últimos envios (nível atual), mas o recorde é histórico.
  const averageScore = Math.round(mean(scores.slice(-RECENT_WINDOW)));
  const bestScore = scores.length ? Math.round(Math.max(...scores)) : 0;

  // Barra "rumo ao atendimento ideal": média ÷ meta (85), teto de 100%.
  const progressPercent = idealProgress(averageScore);

  const idealAttendanceReached = highScoreStreak >= IDEAL_STREAK_REQUIRED;

  let currentLevel = 1;
  for (const r of LEVEL_RULES) {
    const idealOk = r.requiresIdeal ? idealAttendanceReached : true;
    if (idealOk && averageScore >= r.minAverage && completedDays >= r.minDays) {
      currentLevel = r.level;
      break;
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

/** O que ainda falta para o próximo nível (null se já está no 5). */
export interface NextLevelNeed {
  level: number;
  /** Dias enviados que faltam (0 se já cumpriu). */
  daysMissing: number;
  /** Pontos de média que faltam (0 se já cumpriu). */
  averageMissing: number;
  /** Se ainda falta o atendimento ideal (3 dias seguidos acima de 85). */
  needsIdeal: boolean;
}

/**
 * Explica por que o vendedor ainda não subiu de nível. Sem isso, quem tem
 * média 90 e 2 dias enviados vê "Nível 1" e acha que o sistema quebrou.
 */
export function nextLevelNeed(
  currentLevel: number,
  averageScore: number,
  completedDays: number,
  idealAttendanceReached: boolean
): NextLevelNeed | null {
  const target = LEVEL_RULES.find((r) => r.level === currentLevel + 1);
  if (!target) return null;
  return {
    level: target.level,
    daysMissing: Math.max(0, target.minDays - completedDays),
    averageMissing: Math.max(0, target.minAverage - averageScore),
    needsIdeal: target.requiresIdeal && !idealAttendanceReached,
  };
}
