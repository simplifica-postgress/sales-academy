import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { AttendanceType } from "./types";

export interface ProfileFormData {
  name: string;
  company: string;
  salesRole: string;
  experience: string;
  attendanceTypes: AttendanceType[];
  mainDifficulty: string;
  goal: string;
}

/**
 * Completa o cadastro inicial do vendedor: grava o perfil,
 * inicia o treinamento (dia 1) e cria o documento de progresso.
 *
 * Usa setDoc com merge para funcionar mesmo se o documento do
 * usuário ainda não existir (ex.: falha na criação do primeiro login).
 */
export async function completeProfile(
  uid: string,
  email: string,
  data: ProfileFormData,
  opts: { isNew: boolean }
) {
  await setDoc(
    doc(db, "users", uid),
    {
      ...data,
      email,
      role: "seller",
      profileCompleted: true,
      trainingStartDate: serverTimestamp(),
      currentDay: 1,
      ...(opts.isNew
        ? {
            createdAt: serverTimestamp(),
            progressPercent: 0,
            averageScore: 0,
            currentLevel: 1,
          }
        : {}),
    },
    { merge: true }
  );

  await setDoc(doc(db, "progress", uid), {
    totalUploads: 0,
    completedDays: 0,
    currentLevel: 1,
    bestScore: 0,
    averageScore: 0,
    idealAttendanceReached: false,
    highScoreStreak: 0,
    lastAnalysisDate: null,
  });
}
