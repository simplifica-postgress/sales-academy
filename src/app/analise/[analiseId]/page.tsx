"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { collection, doc, getDoc, getDocs, query, where, type Timestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import ScoreRing from "@/components/ScoreRing";
import Spinner from "@/components/Spinner";
import { CRITERIA, IDEAL_SCORE_THRESHOLD } from "@/lib/constants";
import { shortDate } from "@/lib/training";
import { criteriaFill, scoreColor } from "@/lib/ui";
import type { Analysis } from "@/lib/types";

function AnalysisView() {
  const params = useParams<{ analiseId: string }>();
  const id = params.analiseId;
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [prevScore, setPrevScore] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "analyses", id));
        if (!snap.exists()) {
          setNotFound(true);
          return;
        }
        const data = snap.data() as Analysis;
        setAnalysis(data);

        // Delta vs. envio anterior do mesmo vendedor.
        const siblings = await getDocs(query(collection(db, "analyses"), where("userId", "==", data.userId)));
        const ordered = siblings.docs
          .map((d) => ({ id: d.id, score: d.get("generalScore") as number, at: d.get("createdAt") as Timestamp | null }))
          .filter((x) => x.at)
          .sort((a, b) => a.at!.toMillis() - b.at!.toMillis());
        const idx = ordered.findIndex((x) => x.id === id);
        if (idx > 0) setPrevScore(ordered[idx - 1].score);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Spinner /></div>;
  }
  if (notFound || !analysis) {
    return (
      <div className="dc-card p-6">
        <p className="text-sm text-muted">Análise não encontrada. <Link href="/dashboard" className="text-cyan hover:text-cyan-light">Voltar ao dashboard</Link></p>
      </div>
    );
  }

  const delta = prevScore !== null ? analysis.generalScore - prevScore : null;

  return (
    <div className="fade-up">
      {/* O botão de voltar fica no AppShell (vale para todas as telas). */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.015em] text-foreground">Análise do atendimento</h1>
        <span className="font-mono text-[12px] text-muted">Dia {analysis.trainingDay} · {shortDate(analysis.createdAt)}</span>
      </div>

      {/* Ring + resumo */}
      <div className="dc-card mb-3.5 flex flex-wrap items-center gap-7 p-[26px]">
        <div className="mx-auto flex-none">
          <ScoreRing value={analysis.generalScore} size={148} strokeWidth={11} sublabel="de 100" />
        </div>
        <div className="min-w-[260px] flex-1">
          <div className="mono-label">Resumo do atendimento</div>
          <p className="mt-2.5 text-[14px] leading-[1.65] text-foreground">{analysis.summary}</p>
          <div className="mt-3.5 flex flex-wrap gap-2">
            {delta !== null && (
              <span className="rounded-full border border-[rgba(0,203,255,.22)] px-[11px] py-[5px] font-mono text-[11.5px] text-cyan" style={{ background: "rgba(0,203,255,.08)" }}>
                {delta >= 0 ? "+" : ""}{delta} vs. envio anterior
              </span>
            )}
            <span className="rounded-full border border-[rgba(0,45,115,.5)] bg-indicator px-[11px] py-[5px] font-mono text-[11.5px] text-muted">Meta: {IDEAL_SCORE_THRESHOLD}</span>
          </div>
        </div>
      </div>

      {/* Notas por critério */}
      <div className="dc-card mb-3.5 p-6">
        <div className="mono-label mb-[18px]">Nota por critério</div>
        <div className="grid gap-x-7 gap-y-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {CRITERIA.map((c) => {
            const score = analysis.criteriaScores[c.key] ?? 0;
            return (
              <div key={c.key}>
                <div className="mb-[7px] flex items-baseline justify-between gap-2.5">
                  <span className="text-[13px] text-foreground">{c.label}</span>
                  <span className="flex items-baseline gap-1.5">
                    <span className="font-mono text-[10.5px] text-muted">peso {c.weight}</span>
                    <span className="font-mono text-[14px] font-semibold" style={{ color: scoreColor(score) }}>{score}</span>
                  </span>
                </div>
                <div className="h-[5px] overflow-hidden rounded-full bg-indicator">
                  <div className="h-full rounded-full" style={{ width: `${score}%`, background: criteriaFill(score) }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Pontos fortes / atenção / melhorias */}
      <div className="mb-3.5 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <div className="dc-card p-6">
          <div className="mono-label mb-3.5 text-cyan">O que você fez bem</div>
          <div className="flex flex-col gap-3">
            {analysis.strengths.map((s, i) => (
              <div key={i} className="flex gap-[11px] text-[13.5px] leading-[1.55] text-foreground">
                <span className="mt-px flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border border-[rgba(0,203,255,.3)] text-[10px] font-semibold text-cyan" style={{ background: "rgba(0,203,255,.1)" }}>✓</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="dc-card p-6">
          <div className="mono-label mb-3.5 text-danger">O que deixou passar</div>
          <div className="flex flex-col gap-3">
            {analysis.mistakes.map((m, i) => (
              <div key={i} className="flex gap-[11px] text-[13.5px] leading-[1.55] text-foreground">
                <span className="mt-px flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border border-[rgba(255,90,80,.3)] text-[10px] font-semibold text-danger" style={{ background: "rgba(255,90,80,.1)" }}>!</span>
                <span>{m}</span>
              </div>
            ))}
          </div>
          {analysis.improvements.length > 0 && (
            <div className="mt-[18px] border-t border-[rgba(0,45,115,.35)] pt-4">
              <div className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-primary">Onde pode melhorar</div>
              <div className="flex flex-col gap-2.5">
                {analysis.improvements.map((im, i) => (
                  <div key={i} className="flex gap-[11px] text-[13.5px] leading-[1.55] text-foreground">
                    <span className="mt-px font-semibold text-primary">→</span>
                    <span>{im}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Próxima missão */}
      <div className="mb-3.5 rounded-2xl p-px" style={{ background: "linear-gradient(120deg, rgba(0,135,248,.55), rgba(0,203,255,.35), rgba(0,45,115,.4))" }}>
        <div className="rounded-[15px] p-6" style={{ background: "linear-gradient(100deg, #00173d, #03112d)" }}>
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00cbff" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="#00cbff" /></svg>
            <span className="mono-label text-cyan">Próxima missão</span>
          </div>
          <p className="mt-3 max-w-[760px] text-[15.5px] font-medium leading-[1.6] text-foreground">{analysis.nextMission}</p>
        </div>
      </div>

      {/* Transcrição */}
      <div className="dc-card">
        <button onClick={() => setShowTranscript((v) => !v)} className="flex w-full items-center justify-between gap-3 px-6 py-5 text-left">
          <span className="mono-label">Transcrição do atendimento</span>
          <span className="text-[12.5px] font-semibold text-cyan">{showTranscript ? "Ocultar" : "Mostrar"}</span>
        </button>
        {showTranscript && (
          <div className="whitespace-pre-wrap px-6 pb-[22px] font-mono text-[13px] leading-[1.75] text-muted">{analysis.transcript}</div>
        )}
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <AuthGate>
      <AppShell>
        <AnalysisView />
      </AppShell>
    </AuthGate>
  );
}
