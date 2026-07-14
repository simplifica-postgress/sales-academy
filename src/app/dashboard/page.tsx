"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useSellerData } from "@/hooks/useSellerData";
import AuthGate from "@/components/AuthGate";
import AppHeader from "@/components/AppHeader";
import Card from "@/components/Card";
import ProgressBar from "@/components/ProgressBar";
import ScoreRing from "@/components/ScoreRing";
import {
  ATTENDANCE_TYPES,
  LEVELS,
  TRAINING_TOTAL_DAYS,
  weekForDay,
} from "@/lib/constants";
import { computeTrainingDay, isToday, shortDate } from "@/lib/training";
import type { UploadStatus } from "@/lib/types";

const STATUS_LABELS: Record<UploadStatus, { label: string; className: string }> =
  {
    pending: { label: "Na fila", className: "bg-indicator text-muted" },
    processing: {
      label: "Processando",
      className: "bg-primary/15 text-primary",
    },
    done: { label: "Concluído", className: "bg-cyan/15 text-cyan" },
    error: { label: "Erro", className: "bg-red-500/15 text-red-400" },
  };

function attendanceLabel(value: string): string {
  return ATTENDANCE_TYPES.find((t) => t.value === value)?.label ?? value;
}

function Dashboard() {
  const { user, profile } = useAuth();
  const { progress, uploads, analyses } = useSellerData(user?.uid);

  const firstName = profile?.name?.split(" ")[0] ?? "";
  const day = computeTrainingDay(profile?.trainingStartDate ?? null);
  const week = weekForDay(day || 1);
  const levelIndex = (progress?.currentLevel ?? 1) - 1;
  const level = LEVELS[Math.max(0, Math.min(levelIndex, LEVELS.length - 1))];
  const lastAnalysis = analyses[0] ?? null;
  const sentToday = uploads.some((u) => isToday(u.createdAt));
  const scoreByUpload = new Map(analyses.map((a) => [a.uploadId, a]));

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <AppHeader />

        {/* Saudação + dia do treinamento */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-dash">Treinamento comercial</p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
              Olá, {firstName} 👋
            </h1>
          </div>
          <div className="text-right">
            <p className="label-dash">
              Dia {day || 1} de {TRAINING_TOTAL_DAYS}
            </p>
            <p className="mt-1 text-sm font-medium text-cyan">
              Semana {week.week} — {week.name}
            </p>
          </div>
        </div>

        {/* Linha 1: progresso + nota + missão */}
        <div className="mb-4 grid gap-4 lg:grid-cols-3">
          <Card title="Progresso do treinamento" className="lg:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-3xl font-bold text-white">
                {profile?.progressPercent ?? 0}%
              </span>
              <span className="rounded-full border border-card-border bg-indicator px-3 py-1 text-xs font-semibold text-cyan">
                Nível {level.level} · {level.name}
              </span>
            </div>
            <ProgressBar
              value={profile?.progressPercent ?? 0}
              className="mt-4"
            />
            <p className="mt-3 text-xs text-muted">
              Avança com consistência (envio diário) e qualidade (nota das
              análises).
            </p>
          </Card>

          <Card title="Nota atual" className="flex flex-col items-center">
            <ScoreRing
              value={lastAnalysis?.generalScore ?? null}
              sublabel="de 100"
            />
            <p className="mt-3 text-center text-xs text-muted">
              {lastAnalysis
                ? `Média geral: ${Math.round(progress?.averageScore ?? 0)} · Melhor: ${Math.round(progress?.bestScore ?? 0)}`
                : "Envie seu primeiro atendimento para receber sua nota."}
            </p>
          </Card>

          <Card title="Próxima missão">
            <p className="text-sm leading-relaxed text-foreground">
              {lastAnalysis?.nextMission ??
                "Envie seu primeiro atendimento de hoje. A IA vai analisar sua conversa e te passar a primeira missão prática."}
            </p>
            <p className="mt-3 text-xs text-muted">
              Foco da semana: {week.focus}
            </p>
          </Card>
        </div>

        {/* CTA de envio */}
        <Link
          href="/upload"
          className="mb-4 flex items-center justify-between rounded-2xl border border-primary/40 bg-gradient-to-r from-navy to-card px-6 py-5 transition hover:border-cyan/60"
        >
          <div>
            <p className="text-base font-semibold text-white">
              {sentToday
                ? "Atendimento de hoje enviado ✓"
                : "Enviar atendimento de hoje"}
            </p>
            <p className="mt-1 text-sm text-muted">
              {sentToday
                ? "Você pode enviar mais atendimentos se quiser."
                : "Áudio ou vídeo do seu atendimento real — a IA analisa e te devolve o plano."}
            </p>
          </div>
          <span className="rounded-full bg-gradient-to-r from-blue-dark to-primary px-5 py-2.5 text-sm font-semibold text-white">
            Enviar →
          </span>
        </Link>

        {/* Linha 2: última análise + histórico */}
        <div className="mb-4 grid gap-4 lg:grid-cols-2">
          <Card title="Última análise">
            {lastAnalysis ? (
              <div className="space-y-3">
                <p className="text-sm leading-relaxed text-foreground">
                  {lastAnalysis.summary}
                </p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full bg-cyan/15 px-3 py-1 text-cyan">
                    {lastAnalysis.strengths.length} pontos fortes
                  </span>
                  <span className="rounded-full bg-red-500/15 px-3 py-1 text-red-400">
                    {lastAnalysis.mistakes.length} pontos de atenção
                  </span>
                </div>
                <Link
                  href={`/analise/${lastAnalysis.id}`}
                  className="inline-block text-sm font-semibold text-cyan transition hover:text-cyan-light"
                >
                  Ver análise completa →
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted">
                Nenhuma análise ainda. Assim que você enviar um atendimento, o
                resultado aparece aqui.
              </p>
            )}
          </Card>

          <Card title="Histórico de envios">
            {uploads.length > 0 ? (
              <ul className="divide-y divide-card-border">
                {uploads.slice(0, 6).map((u) => {
                  const analysis = scoreByUpload.get(u.id);
                  const status = STATUS_LABELS[u.status];
                  return (
                    <li
                      key={u.id}
                      className="flex items-center justify-between gap-3 py-2.5 text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-muted">
                          {shortDate(u.createdAt)}
                        </span>
                        <span className="text-foreground">
                          {u.fileType === "video" ? "Vídeo" : "Áudio"} ·{" "}
                          {attendanceLabel(u.attendanceType)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        {analysis ? (
                          <span className="font-bold text-white">
                            {Math.round(analysis.generalScore)}
                          </span>
                        ) : null}
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                        >
                          {status.label}
                        </span>
                        {analysis ? (
                          <Link
                            href={`/analise/${analysis.id}`}
                            className="text-xs font-semibold text-cyan hover:text-cyan-light"
                          >
                            Ver
                          </Link>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                Nenhum envio ainda. Seu histórico de atendimentos aparecerá
                aqui.
              </p>
            )}
          </Card>
        </div>

        {/* Cursos — em breve */}
        <Card className="border-dashed">
          <div className="flex items-center gap-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indicator text-lg">
              🔒
            </span>
            <div>
              <p className="text-sm font-semibold text-white">
                Cursos Simplifica — em breve
              </p>
              <p className="mt-0.5 text-sm text-muted">
                Em breve, você terá acesso aos treinamentos comerciais da
                Simplifica para acelerar ainda mais sua evolução.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}
