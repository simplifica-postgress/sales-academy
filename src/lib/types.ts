import type { Timestamp } from "firebase/firestore";

// ---------- Usuários ----------

export type UserRole = "seller" | "admin";

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
  company: string;
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
  uploadId: string;
  transcript: string;
  summary: string;
  strengths: string[];
  mistakes: string[];
  improvements: string[];
  criteriaScores: CriteriaScores;
  generalScore: number; // 0–100, média ponderada calculada no backend
  nextMission: string;
  trainingDay: number;
  createdAt: Timestamp;
}

// ---------- Progresso ----------

export interface Progress {
  totalUploads: number;
  completedDays: number;
  currentLevel: number;
  bestScore: number;
  averageScore: number;
  idealAttendanceReached: boolean;
  highScoreStreak: number; // dias seguidos com nota > 85
  lastAnalysisDate: Timestamp | null;
}
