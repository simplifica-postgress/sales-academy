"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AuthGate from "@/components/AuthGate";
import AppHeader from "@/components/AppHeader";
import Card from "@/components/Card";
import ScoreRing from "@/components/ScoreRing";
import Spinner from "@/components/Spinner";
import { CRITERIA } from "@/lib/constants";
import { shortDate } from "@/lib/training";
import type { Analysis } from "@/lib/types";

function scoreColor(score: number): string {
  if (score >= 85) return "bg-cyan";
  if (score >= 70) return "bg-primary";
  if (score >= 50) return "bg-blue-dark";
  return "bg-red-500/70";
}

function CriteriaBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="font-semibold text-white">{score}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-indicator">
        <div
          className={`h-full rounded-full ${scoreColor(score)} transition-all duration-700`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function ListBlock({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: "good" | "bad" | "tip";
}) {
  const marker =
    tone === "good" ? "text-cyan" : tone === "bad" ? "text-red-400" : "text-primary";
  const icon = tone === "good" ? "✓" : tone === "bad" ? "!" : "→";
  if (!items?.length) return null;
  return (
    <Card title={title}>
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed">
            <span className={`mt-0.5 font-bold ${marker}`}>{icon}</span>
            <span className="text-foreground">{item}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AnalysisView() {
  const params = useParams<{ analiseId: string }>();
  const id = params.analiseId;
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "analyses", id));
        if (snap.exists()) setAnalysis(snap.data() as Analysis);
        else setNotFound(true);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (notFound || !analysis) {
    return (
      <Card>
        <p className="text-sm text-muted">
          Análise não encontrada.{" "}
          <Link href="/dashboard" className="text-cyan hover:text-cyan-light">
            Voltar ao dashboard
          </Link>
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho: nota geral + resumo */}
      <Card>
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <div className="flex flex-col items-center">
            <ScoreRing value={analysis.generalScore} size={140} sublabel="de 100" />
            <span className="mt-2 text-xs text-muted">
              Dia {analysis.trainingDay} · {shortDate(analysis.createdAt)}
            </span>
          </div>
          <div className="flex-1">
            <p className="label-dash mb-2">Resumo do atendimento</p>
            <p className="text-sm leading-relaxed text-foreground">
              {analysis.summary}
            </p>
          </div>
        </div>
      </Card>

      {/* Notas por critério */}
      <Card title="Nota por critério">
        <div className="grid gap-4 sm:grid-cols-2">
          {CRITERIA.map((c) => (
            <CriteriaBar
              key={c.key}
              label={c.label}
              score={analysis.criteriaScores[c.key] ?? 0}
            />
          ))}
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ListBlock title="O que você fez bem" items={analysis.strengths} tone="good" />
        <ListBlock
          title="O que deixou passar"
          items={analysis.mistakes}
          tone="bad"
        />
      </div>

      <ListBlock
        title="Onde pode melhorar"
        items={analysis.improvements}
        tone="tip"
      />

      {/* Próxima missão — destaque */}
      <Card className="border-primary/40 bg-gradient-to-r from-navy to-card">
        <p className="label-dash mb-2 text-cyan">🎯 Próxima missão</p>
        <p className="text-base font-medium leading-relaxed text-white">
          {analysis.nextMission}
        </p>
      </Card>

      {/* Transcrição (recolhível) */}
      <Card>
        <button
          type="button"
          onClick={() => setShowTranscript((v) => !v)}
          className="flex w-full items-center justify-between text-left"
        >
          <span className="label-dash">Transcrição do atendimento</span>
          <span className="text-sm text-cyan">
            {showTranscript ? "Ocultar" : "Mostrar"}
          </span>
        </button>
        {showTranscript && (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted">
            {analysis.transcript}
          </p>
        )}
      </Card>

      <div className="flex justify-center pt-2">
        <Link
          href="/dashboard"
          className="text-sm font-semibold text-cyan transition hover:text-cyan-light"
        >
          ← Voltar ao dashboard
        </Link>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <AuthGate>
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-4xl">
          <AppHeader />
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">Análise do atendimento</h1>
            <p className="mt-1 text-sm text-muted">
              Sua devolutiva completa, critério por critério.
            </p>
          </div>
          <AnalysisView />
        </div>
      </main>
    </AuthGate>
  );
}
