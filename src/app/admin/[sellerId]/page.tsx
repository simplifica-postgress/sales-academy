"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, where, type Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import ScoreRing from "@/components/ScoreRing";
import Spinner from "@/components/Spinner";
import EvolutionChart from "@/components/EvolutionChart";
import { LEVELS } from "@/lib/constants";
import { shortDate } from "@/lib/training";
import { scoreColor } from "@/lib/ui";
import type { Analysis, UserProfile } from "@/lib/types";

type AnalysisRow = Analysis & { id: string };

function SellerDetail() {
  const params = useParams<{ sellerId: string }>();
  const router = useRouter();
  const uid = params.sellerId;
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (!userSnap.exists()) return setNotFound(true);
        setProfile(userSnap.data() as UserProfile);
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
      <div className="mb-[22px]">
        <button onClick={() => router.push("/admin")} className="inline-flex items-center gap-[7px] text-[12.5px] font-medium text-muted transition hover:text-cyan">← Equipe</button>
      </div>

      <div className="dc-card mb-3.5 flex flex-wrap items-center gap-[26px] p-[26px]">
        <div className="flex-none"><ScoreRing value={latest?.generalScore ?? null} size={118} strokeWidth={9} sublabel="atual" /></div>
        <div className="min-w-[240px] flex-1">
          <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.015em] text-foreground">{profile.name}</h1>
          <div className="mt-[5px] text-[13px] text-muted">{profile.salesRole} · {profile.company}</div>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <span className={`${badge} text-cyan`} style={{ background: "rgba(0,203,255,.07)", border: "1px solid rgba(0,203,255,.22)" }}>Dia {profile.currentDay || 0} de 30</span>
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
            <span><span className="mr-1.5 inline-block w-3.5 align-middle" style={{ borderTop: "1px dashed #6d8698", height: 0 }} />meta 85</span>
          </span>
        </div>
        {analyses.length > 0 ? (
          <EvolutionChart points={analyses.map((a) => ({ score: a.generalScore, label: shortDate(a.createdAt) }))} />
        ) : (
          <p className="py-4 text-sm text-muted">Nenhuma análise ainda para exibir evolução.</p>
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
              <span className="flex-1 text-[13.5px] text-foreground">Dia {a.trainingDay}</span>
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
