"use client";

import { useEffect, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { Analysis, Progress, Upload } from "@/lib/types";

export type UploadWithId = Upload & { id: string };
export type AnalysisWithId = Analysis & { id: string };

function byNewest<T extends { createdAt: Timestamp }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0)
  );
}

/**
 * Dados do vendedor em tempo real (progresso, uploads e análises).
 * Ordenação feita no cliente para dispensar índices compostos no MVP.
 */
export function useSellerData(uid: string | undefined) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const [uploads, setUploads] = useState<UploadWithId[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const unsubProgress = onSnapshot(doc(db, "progress", uid), (snap) => {
      setProgress(snap.exists() ? (snap.data() as Progress) : null);
    });

    const unsubUploads = onSnapshot(
      query(collection(db, "uploads"), where("userId", "==", uid)),
      (snap) => {
        setUploads(
          byNewest(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as UploadWithId)
          )
        );
        setLoading(false);
      }
    );

    const unsubAnalyses = onSnapshot(
      query(collection(db, "analyses"), where("userId", "==", uid)),
      (snap) => {
        setAnalyses(
          byNewest(
            snap.docs.map((d) => ({ id: d.id, ...d.data() }) as AnalysisWithId)
          )
        );
      }
    );

    return () => {
      unsubProgress();
      unsubUploads();
      unsubAnalyses();
    };
  }, [uid]);

  return { progress, uploads, analyses, loading };
}
