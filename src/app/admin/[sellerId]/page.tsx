"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, onSnapshot, query, where, type Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { adminPost } from "@/lib/adminApi";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import ScoreRing from "@/components/ScoreRing";
import Spinner from "@/components/Spinner";
import EvolutionChart from "@/components/EvolutionChart";
import { ATTENDANCE_TYPES, LEVELS } from "@/lib/constants";
import { shortDate } from "@/lib/training";
import { scoreColor } from "@/lib/ui";
import type { Analysis, Upload, UserProfile } from "@/lib/types";

type AnalysisRow = Analysis & { id: string };
type UploadRow = Upload & { id: string };

function attendanceLabel(value: string): string {
  return ATTENDANCE_TYPES.find((t) => t.value === value)?.label ?? value;
}

function humanSize(bytes?: number): string {
  if (!bytes) return "—";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SellerDetail() {
  const params = useParams<{ sellerId: string }>();
  const uid = params.sellerId;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [daysActive, setDaysActive] = useState(0);
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [uploads, setUploads] = useState<UploadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (!userSnap.exists()) return setNotFound(true);
        setProfile(userSnap.data() as UserProfile);
        // Mesma fonte da lista de vendedores (progress.completedDays), para os
        // dois painéis mostrarem sempre a mesma contagem de dias enviados.
        const progSnap = await getDoc(doc(db, "progress", uid));
        setDaysActive((progSnap.data()?.completedDays as number) ?? 0);
        const snap = await getDocs(query(collection(db, "analyses"), where("userId", "==", uid)));
        setAnalyses(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as AnalysisRow)
            .sort((a, b) => ((a.createdAt as Timestamp)?.toMillis() ?? 0) - ((b.createdAt as Timestamp)?.toMillis() ?? 0))
        );
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  // Gravações em tempo real (para refletir a exclusão na hora).
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(
      query(collection(db, "uploads"), where("userId", "==", uid)),
      (snap) =>
        setUploads(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }) as UploadRow)
            .sort(
              (a, b) =>
                ((b.createdAt as Timestamp)?.toMillis() ?? 0) -
                ((a.createdAt as Timestamp)?.toMillis() ?? 0)
            )
        )
    );
  }, [uid]);

  async function deleteRecording(u: UploadRow) {
    const ok = confirm(
      `Apagar a gravação de ${shortDate(u.createdAt)}?\n\nO arquivo de áudio/vídeo será excluído em definitivo.\nA análise da IA (notas, pontos e transcrição) será PRESERVADA.`
    );
    if (!ok) return;
    setError("");
    setNotice("");
    setBusyId(u.id);
    try {
      await adminPost("/api/admin/delete-recording", { uploadId: u.id });
      setNotice("Gravação excluída. A análise foi preservada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir.");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Spinner /></div>;
  if (notFound || !profile) {
    return <div className="dc-card p-6"><p className="text-sm text-muted">Vendedor não encontrado. <Link href="/admin" className="text-cyan hover:text-cyan-light">Voltar ao painel</Link></p></div>;
  }

  const latest = analyses[analyses.length - 1] ?? null;
  const level = profile.currentLevel ?? 1;
  const levelName = LEVELS[Math.max(0, Math.min(level - 1, 4))].name;
  const badge = "rounded-full px-3 py-[5px] font-mono text-[11.5px]";

  return (
    <div className="fade-up">
      {/* O botão de voltar fica no AppShell (vale para todas as telas). */}
      <div className="dc-card mb-3.5 flex flex-wrap items-center gap-[26px] p-[26px]">
        <div className="flex-none"><ScoreRing value={latest?.generalScore ?? null} size={118} strokeWidth={9} sublabel="atual" /></div>
        <div className="min-w-[240px] flex-1">
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.015em] text-foreground">{profile.name}</h1>
          <div className="mt-[5px] text-[13px] text-muted">{profile.salesRole} · {profile.company}</div>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <span className={`${badge} text-cyan`} style={{ background: "rgba(0,203,255,.07)", border: "1px solid rgba(0,203,255,.22)" }}>{daysActive} {daysActive === 1 ? "dia enviado" : "dias enviados"}</span>
            <span className={`${badge} text-cyan`} style={{ background: "rgba(0,203,255,.07)", border: "1px solid rgba(0,203,255,.22)" }}>Nível {level} · {levelName}</span>
            <span className={`${badge} text-foreground`} style={{ background: "#152946", border: "1px solid rgba(0,45,115,.5)" }}>Média {Math.round(profile.averageScore ?? 0)}</span>
          </div>
        </div>
      </div>

      <div className="mb-3.5 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
        <div className="dc-card p-[22px]">
          <div className="mono-label mb-2.5">Principal dificuldade</div>
          <p className="text-[13.5px] leading-[1.6] text-foreground">{profile.mainDifficulty || "—"}</p>
        </div>
        <div className="dc-card p-[22px]">
          <div className="mono-label mb-2.5">Objetivo no treinamento</div>
          <p className="text-[13.5px] leading-[1.6] text-foreground">{profile.goal || "—"}</p>
        </div>
      </div>

      <div className="dc-card mb-3.5 p-6">
        <div className="mb-4 flex items-center justify-between">
          <span className="mono-label">Evolução das notas</span>
          <span className="flex gap-3.5 font-mono text-[10.5px] text-muted">
            <span><span className="mr-1.5 inline-block h-[2px] w-3.5 align-middle" style={{ background: "#00cbff" }} />nota</span>
            <span style={{ color: "#25d97d" }}><span className="mr-1.5 inline-block w-3.5 align-middle" style={{ borderTop: "1px dashed #25d97d", height: 0 }} />meta 85</span>
          </span>
        </div>
        {analyses.length > 0 ? (
          <EvolutionChart points={analyses.map((a) => ({ score: a.generalScore, label: shortDate(a.createdAt) }))} />
        ) : (
          <p className="py-4 text-sm text-muted">Nenhuma análise ainda para exibir evolução.</p>
        )}
      </div>

      {/* Gravações (LGPD: exclusão do arquivo preservando a análise) */}
      <div className="dc-card mb-3.5 p-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <span className="mono-label">Gravações</span>
          <span className="text-[11.5px] text-muted">
            {uploads.filter((u) => !u.fileDeleted).length} armazenada(s) · {uploads.filter((u) => u.fileDeleted).length} excluída(s)
          </span>
        </div>
        <p className="mb-3 text-[12px] leading-[1.6] text-muted">
          Excluir a gravação apaga o áudio/vídeo em definitivo, mas <strong className="text-foreground">mantém a análise da IA</strong> (notas, pontos e transcrição). Use para atender a pedido de exclusão do cliente.
        </p>

        {notice && <p className="mb-3 rounded-[10px] border border-[rgba(0,203,255,.3)] bg-[rgba(0,203,255,.08)] px-3.5 py-2.5 text-[12.5px] text-cyan">{notice}</p>}
        {error && <p className="mb-3 rounded-[10px] border border-[rgba(255,90,80,.28)] bg-[rgba(255,90,80,.08)] px-3.5 py-2.5 text-[12.5px] text-danger">{error}</p>}

        {uploads.length === 0 ? (
          <p className="py-4 text-sm text-muted">Nenhum envio ainda.</p>
        ) : (
          uploads.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 border-b border-[rgba(0,45,115,.28)] px-0.5 py-3 last:border-0">
              <span className="w-12 flex-none font-mono text-[12px] text-muted">{shortDate(u.createdAt)}</span>
              <span className="flex-1 text-[13px] text-foreground">
                {u.fileType === "video" ? "Vídeo" : "Áudio"} · {attendanceLabel(u.attendanceType)}
                <span className="ml-2 font-mono text-[11px] text-muted">{humanSize(u.fileSize)}</span>
              </span>
              {u.consentVersion && (
                <span className="rounded-full border border-[rgba(0,203,255,.22)] px-2.5 py-0.5 text-[10.5px] text-cyan" style={{ background: "rgba(0,203,255,.07)" }} title={`Termo aceito em ${shortDate(u.consentAt)}`}>
                  consentido v{u.consentVersion}
                </span>
              )}
              {u.fileDeleted ? (
                <span className="rounded-full bg-indicator px-2.5 py-1 text-[11px] font-medium text-muted">
                  arquivo excluído · análise mantida
                </span>
              ) : (
                <button
                  onClick={() => deleteRecording(u)}
                  disabled={busyId === u.id}
                  className="rounded-lg border border-[rgba(255,90,80,.35)] px-3 py-1.5 text-[12px] font-medium text-danger transition disabled:opacity-50"
                  style={{ background: "rgba(255,90,80,.06)" }}
                >
                  {busyId === u.id ? "Excluindo…" : "Excluir gravação"}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      <div className="dc-card p-6">
        <div className="mono-label mb-2">Histórico de análises</div>
        {analyses.length === 0 ? (
          <p className="py-4 text-sm text-muted">Nenhuma análise ainda.</p>
        ) : (
          [...analyses].reverse().map((a) => (
            <div key={a.id} className="flex items-center gap-3.5 border-b border-[rgba(0,45,115,.28)] px-0.5 py-3 last:border-0">
              <span className="w-12 flex-none font-mono text-[12px] text-muted">{shortDate(a.createdAt)}</span>
              <span className="flex-1 truncate text-[13.5px] text-muted">{a.summary}</span>
              <span className="font-mono text-[14px] font-semibold" style={{ color: scoreColor(a.generalScore) }}>{Math.round(a.generalScore)}</span>
              <Link href={`/analise/${a.id}`} className="flex-none text-[12px] font-semibold text-cyan hover:text-cyan-light">Ver</Link>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function SellerDetailPage() {
  return (
    <AuthGate requireAdmin>
      <AppShell>
        <SellerDetail />
      </AppShell>
    </AuthGate>
  );
}
