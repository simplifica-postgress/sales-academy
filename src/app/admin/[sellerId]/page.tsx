"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  type Timestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import AuthGate from "@/components/AuthGate";
import AppHeader from "@/components/AppHeader";
import Card from "@/components/Card";
import Spinner from "@/components/Spinner";
import ScoreRing from "@/components/ScoreRing";
import EvolutionChart from "@/components/EvolutionChart";
import { LEVELS } from "@/lib/constants";
import { shortDate } from "@/lib/training";
import type { Analysis, UserProfile } from "@/lib/types";

type AnalysisRow = Analysis & { id: string };

function SellerDetail() {
  const params = useParams<{ sellerId: string }>();
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
        if (!userSnap.exists()) {
          setNotFound(true);
          return;
        }
        setProfile(userSnap.data() as UserProfile);

        const analysesSnap = await getDocs(
          query(collection(db, "analyses"), where("userId", "==", uid))
        );
        const rows = analysesSnap.docs
          .map((d) => ({ id: d.id, ...d.data() }) as AnalysisRow)
          .sort(
            (a, b) =>
              (a.createdAt?.toMillis() ?? 0) - (b.createdAt?.toMillis() ?? 0)
          );
        setAnalyses(rows);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (notFound || !profile) {
    return (
      <Card>
        <p className="text-sm text-muted">
          Vendedor não encontrado.{" "}
          <Link href="/admin" className="text-cyan hover:text-cyan-light">
            Voltar ao painel
          </Link>
        </p>
      </Card>
    );
  }

  const latest = analyses[analyses.length - 1] ?? null;
  const level = profile.currentLevel ?? 1;

  return (
    <div className="space-y-4">
      {/* Perfil */}
      <Card>
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
          <ScoreRing value={latest?.generalScore ?? null} sublabel="atual" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{profile.name}</h1>
            <p className="text-sm text-muted">
              {profile.salesRole} · {profile.company}
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-card-border bg-indicator px-3 py-1 text-cyan">
                Dia {profile.currentDay || 0} de 30
              </span>
              <span className="rounded-full border border-card-border bg-indicator px-3 py-1 text-cyan">
                Nível {level} ·{" "}
                {LEVELS[Math.max(0, Math.min(level - 1, 4))].name}
              </span>
              <span className="rounded-full border border-card-border bg-indicator px-3 py-1 text-foreground">
                Média {Math.round(profile.averageScore ?? 0)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card title="Principal dificuldade">
          <p className="text-sm leading-relaxed text-foreground">
            {profile.mainDifficulty || "—"}
          </p>
        </Card>
        <Card title="Objetivo no treinamento">
          <p className="text-sm leading-relaxed text-foreground">
            {profile.goal || "—"}
          </p>
        </Card>
      </div>

      <Card title="Evolução das notas">
        {analyses.length > 0 ? (
          <EvolutionChart
            points={analyses.map((a) => ({
              score: a.generalScore,
              label: shortDate(a.createdAt),
            }))}
          />
        ) : (
          <p className="py-4 text-sm text-muted">
            Nenhuma análise ainda para exibir evolução.
          </p>
        )}
      </Card>

      <Card title="Histórico de análises">
        {analyses.length === 0 ? (
          <p className="py-4 text-sm text-muted">Nenhuma análise ainda.</p>
        ) : (
          <ul className="divide-y divide-card-border">
            {[...analyses].reverse().map((a) => (
              <li
                key={a.id}
                className="flex items-center justify-between gap-3 py-3 text-sm"
              >
                <div>
                  <span className="text-muted">{shortDate(a.createdAt)}</span>
                  <span className="ml-3 text-foreground">
                    Dia {a.trainingDay}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-white">
                    {Math.round(a.generalScore)}
                  </span>
                  <Link
                    href={`/analise/${a.id}`}
                    className="text-xs font-semibold text-cyan hover:text-cyan-light"
                  >
                    Ver
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="flex justify-center pt-2">
        <Link
          href="/admin"
          className="text-sm font-semibold text-cyan transition hover:text-cyan-light"
        >
          ← Voltar ao painel
        </Link>
      </div>
    </div>
  );
}

export default function SellerDetailPage() {
  return (
    <AuthGate requireAdmin>
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-4xl">
          <AppHeader />
          <SellerDetail />
        </div>
      </main>
    </AuthGate>
  );
}
