import "server-only";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminBucket, adminDb } from "./firebaseAdmin";
import { RETENTION_DAYS } from "@/lib/constants";

/**
 * Apaga o ARQUIVO de um envio e marca o registro.
 * A análise da IA nunca é tocada — ela não depende do arquivo.
 *
 * @param by uid do gestor, ou "retention" quando é a limpeza automática.
 */
export async function deleteRecordingFile(
  uploadId: string,
  by: string
): Promise<{ ok: boolean; alreadyDeleted?: boolean; notFound?: boolean }> {
  const ref = adminDb.collection("uploads").doc(uploadId);
  const snap = await ref.get();
  if (!snap.exists) return { ok: false, notFound: true };
  if (snap.get("fileDeleted") === true) return { ok: true, alreadyDeleted: true };

  const filePath = snap.get("filePath") as string | undefined;
  if (filePath) {
    await adminBucket.file(filePath).delete({ ignoreNotFound: true });
  }

  await ref.update({
    fileDeleted: true,
    fileDeletedAt: FieldValue.serverTimestamp(),
    fileDeletedBy: by,
  });

  return { ok: true };
}

export interface RetentionResult {
  retentionDays: number;
  cutoff: string;
  scanned: number;
  deleted: number;
  errors: number;
}

/**
 * Limpeza por retenção: apaga as gravações mais antigas que o prazo,
 * preservando todas as análises. Idempotente — pode rodar quantas vezes quiser.
 */
export async function runRetentionCleanup(
  days = RETENTION_DAYS
): Promise<RetentionResult> {
  const cutoffDate = new Date(Date.now() - days * 86_400_000);
  const cutoff = Timestamp.fromDate(cutoffDate);

  // Só envios antigos que ainda têm arquivo.
  const snap = await adminDb
    .collection("uploads")
    .where("createdAt", "<", cutoff)
    .get();

  let deleted = 0;
  let errors = 0;

  for (const doc of snap.docs) {
    if (doc.get("fileDeleted") === true) continue;
    if (!doc.get("filePath")) continue;
    try {
      await deleteRecordingFile(doc.id, "retention");
      deleted++;
    } catch (err) {
      console.error("Retenção: falha ao apagar", doc.id, err);
      errors++;
    }
  }

  return {
    retentionDays: days,
    cutoff: cutoffDate.toISOString(),
    scanned: snap.size,
    deleted,
    errors,
  };
}
