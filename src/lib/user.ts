import { auth } from "./firebase";
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
 * Conclui o cadastro do vendedor via backend.
 *
 * O cliente NÃO escreve no Firestore aqui de propósito: as Rules bloqueiam
 * qualquer escrita de campos ligados a avaliação/progresso. Quem inicia o
 * treinamento (trainingStartDate, currentDay, progress) é o servidor.
 */
export async function completeProfile(data: ProfileFormData): Promise<void> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error("Sessão expirada. Entre novamente.");

  const res = await fetch("/api/profile/complete", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (payload as { error?: string }).error ?? "Não foi possível salvar."
    );
  }
}
