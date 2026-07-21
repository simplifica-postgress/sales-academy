import type { Timestamp } from "firebase/firestore";

// ---------- Usuários ----------

/**
 * seller  — vendedor: só enxerga o próprio treinamento.
 * manager — gestor da empresa: vê os vendedores DA SUA empresa e testa a IA.
 *           Não adiciona pessoas nem muda papéis.
 * master  — Simplifica: organiza empresas, vincula pessoas e muda papéis.
 */
export type UserRole = "seller" | "manager" | "master";

/** Empresa (a "pasta" do painel master). */
export interface Company {
  name: string;
  createdAt: Timestamp;
  updatedAt: Timestamp | null;
}

export type AttendanceType =
  | "ligacao"
  | "whatsapp"
  | "presencial"
  | "reuniao"
  | "sdr"
  | "closer";

export interface UserProfile {
  name: string;
  email: string;
  role: UserRole;
  /** Empresa declarada pelo próprio vendedor no cadastro (texto livre). */
  company: string;
  /**
   * Empresa de verdade: a pasta em que o master colocou esta pessoa.
   * null = ainda não vinculada. É este campo (nunca o texto livre) que
   * decide o que o gestor enxerga.
   */
  companyId: string | null;
  salesRole: string;
  experience: string;
  attendanceTypes: AttendanceType[];
  mainDifficulty: string;
  goal: string;
  trainingStartDate: Timestamp | null;
  currentDay: number;
  progressPercent: number;
  averageScore: number;
  currentLevel: number; // 1–5
  profileCompleted: boolean;
  createdAt: Timestamp;
}

// ---------- Uploads ----------

export type UploadStatus = "pending" | "processing" | "done" | "error";

export interface Upload {
  userId: string;
  /** Cópia do companyId do dono, para as regras filtrarem sem fazer join. */
  companyId?: string | null;
  fileUrl: string;
  filePath: string; // caminho no Storage: uploads/{userId}/{data}/{arquivo}
  fileType: "audio" | "video";
  mimeType: string;
  fileSize?: number;
  status: UploadStatus;
  trainingDay: number;
  attendanceType: AttendanceType;
  observation: string;
  errorMessage?: string;
  createdAt: Timestamp;

  // ---- Consentimento (LGPD) ----
  /** Versão do termo aceita no momento do envio. */
  consentVersion?: string;
  /** Quando o vendedor aceitou o termo. */
  consentAt?: Timestamp;

  // ---- Exclusão da gravação ----
  /** True quando o arquivo foi apagado do Storage (a análise é preservada). */
  fileDeleted?: boolean;
  fileDeletedAt?: Timestamp;
  /** uid de quem solicitou a exclusão (ou "retention" se automática). */
  fileDeletedBy?: string;
}

// ---------- Análises ----------

export type CriterionKey =
  | "abertura"
  | "clareza"
  | "diagnostico"
  | "dor"
  | "valor"
  | "objecoes"
  | "proximoPasso"
  | "fechamento";

export type CriteriaScores = Record<CriterionKey, number>;

export interface Analysis {
  userId: string;
  /** Cópia do companyId do dono, para as regras filtrarem sem fazer join. */
  companyId?: string | null;
  uploadId: string;
  transcript: string;
  summary: string;
  strengths: string[];
  mistakes: string[];
  improvements: string[];
  criteriaScores: CriteriaScores;
  generalScore: number; // 0–100, média ponderada calculada no backend
  /** Critério que a missão ataca (o de menor nota). Ausente em análises antigas. */
  missionFocus?: CriterionKey;
  nextMission: string;
  trainingDay: number;
  createdAt: Timestamp;
}

// ---------- Progresso ----------

export interface Progress {
  /** Cópia do companyId do dono, para as regras filtrarem sem fazer join. */
  companyId?: string | null;
  totalUploads: number;
  completedDays: number; // dias distintos em que houve envio
  currentLevel: number;
  bestScore: number;
  averageScore: number;
  idealAttendanceReached: boolean;
  sendStreak: number; // dias seguidos com envio (hábito)
  highScoreStreak: number; // dias seguidos com nota > 85 (para o nível ideal)
  lastAnalysisDate: Timestamp | null;
}
