"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  type Query,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { isToday } from "@/lib/training";
import type { Progress, UserProfile } from "@/lib/types";

export interface SellerRow {
  uid: string;
  profile: UserProfile;
  progress: Progress | null;
  sentToday: boolean;
  lastUpload: Timestamp | null;
  totalUploads: number;
}

export interface AdminData {
  sellers: SellerRow[];
  loading: boolean;
  teamAverage: number;
  sentTodayCount: number;
}

export interface TeamScope {
  /** null = todas as empresas (só o master consegue ler assim). */
  companyId: string | null;
  /** Master lê tudo; gestor só a própria empresa. */
  isMaster: boolean;
}

/**
 * Agrega em tempo real os dados da equipe.
 *
 * As consultas são escopadas por empresa de propósito: o gestor não pode
 * assinar a coleção inteira (as Rules negam), e escopar aqui evita pedir
 * dados que não são dele. Só o master lê sem filtro.
 */
export function useAdminData(scope: TeamScope | null): AdminData {
  const [sellers, setSellers] = useState<Record<string, UserProfile>>({});
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [uploadsByUser, setUploadsByUser] = useState<
    Record<string, Timestamp[]>
  >({});
  // Guarda QUAL escopo já chegou, em vez de um booleano: ao trocar de
  // empresa, `ready` volta a ser falso sozinho, sem setState dentro do efeito
  // (que dispara renders em cascata).
  const [readyKey, setReadyKey] = useState<string | null>(null);

  const companyId = scope?.companyId ?? null;
  const isMaster = scope?.isMaster ?? false;
  const enabled = Boolean(scope) && (isMaster || companyId !== null);
  const scopeKey = companyId ?? "__todas__";
  const ready = readyKey === scopeKey;

  useEffect(() => {
    if (!enabled) return;

    // Sem empresa definida só o master chega aqui (visão "todas").
    const byCompany = <T>(col: string): Query<T> =>
      (companyId === null
        ? query(collection(db, col))
        : query(collection(db, col), where("companyId", "==", companyId))) as Query<T>;

    const unsubUsers = onSnapshot(byCompany("users"), (snap) => {
      const map: Record<string, UserProfile> = {};
      snap.forEach((d) => {
        const data = d.data() as UserProfile;
        // Filtro de papel no cliente para dispensar índice composto.
        if (data.role === "seller") map[d.id] = data;
      });
      setSellers(map);
      setReadyKey(scopeKey);
    });

    const unsubProgress = onSnapshot(byCompany("progress"), (snap) => {
      const map: Record<string, Progress> = {};
      snap.forEach((d) => (map[d.id] = d.data() as Progress));
      setProgress(map);
    });

    const unsubUploads = onSnapshot(byCompany("uploads"), (snap) => {
      const map: Record<string, Timestamp[]> = {};
      snap.forEach((d) => {
        const uid = d.get("userId") as string;
        const ts = d.get("createdAt") as Timestamp | null;
        if (!uid || !ts) return;
        (map[uid] ??= []).push(ts);
      });
      setUploadsByUser(map);
    });

    return () => {
      unsubUsers();
      unsubProgress();
      unsubUploads();
    };
  }, [enabled, companyId, scopeKey]);

  const rows: SellerRow[] = Object.entries(sellers)
    .map(([uid, profile]) => {
      const times = uploadsByUser[uid] ?? [];
      const lastUpload =
        times.length > 0
          ? times.reduce((a, b) => (a.toMillis() > b.toMillis() ? a : b))
          : null;
      return {
        uid,
        profile,
        progress: progress[uid] ?? null,
        sentToday: times.some((t) => isToday(t)),
        lastUpload,
        totalUploads: times.length,
      };
    })
    .sort(
      (a, b) =>
        (b.progress?.averageScore ?? 0) - (a.progress?.averageScore ?? 0)
    );

  const scored = rows.filter((r) => (r.progress?.averageScore ?? 0) > 0);
  const teamAverage = scored.length
    ? Math.round(
        scored.reduce((s, r) => s + (r.progress?.averageScore ?? 0), 0) /
          scored.length
      )
    : 0;
  const sentTodayCount = rows.filter((r) => r.sentToday).length;

  return { sellers: rows, loading: enabled && !ready, teamAverage, sentTodayCount };
}
