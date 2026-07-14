"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
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

/** Agrega, em tempo real, os dados de todos os vendedores para o gestor. */
export function useAdminData(enabled: boolean): AdminData {
  const [sellers, setSellers] = useState<Record<string, UserProfile>>({});
  const [progress, setProgress] = useState<Record<string, Progress>>({});
  const [uploadsByUser, setUploadsByUser] = useState<
    Record<string, Timestamp[]>
  >({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const unsubUsers = onSnapshot(
      query(collection(db, "users"), where("role", "==", "seller")),
      (snap) => {
        const map: Record<string, UserProfile> = {};
        snap.forEach((d) => (map[d.id] = d.data() as UserProfile));
        setSellers(map);
        setReady(true);
      }
    );

    const unsubProgress = onSnapshot(collection(db, "progress"), (snap) => {
      const map: Record<string, Progress> = {};
      snap.forEach((d) => (map[d.id] = d.data() as Progress));
      setProgress(map);
    });

    const unsubUploads = onSnapshot(collection(db, "uploads"), (snap) => {
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
  }, [enabled]);

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

  return { sellers: rows, loading: !ready, teamAverage, sentTodayCount };
}
