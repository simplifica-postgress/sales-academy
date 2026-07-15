"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useSellerData } from "@/hooks/useSellerData";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import ScoreRing from "@/components/ScoreRing";
import Journey from "@/components/Journey";
import { ATTENDANCE_TYPES, LEVELS, TRAINING_TOTAL_DAYS, weekForDay } from "@/lib/constants";
import { computeTrainingDay, isToday, shortDate } from "@/lib/training";
import { scoreColor, statusPill } from "@/lib/ui";

function attendanceLabel(value: string): string {
  return ATTENDANCE_TYPES.find((t) => t.value === value)?.label ?? value;
}

function LevelBars({ level }: { level: number }) {
  return (
    <div className="mt-3 flex gap-1">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="h-1 flex-1 rounded-full"
          style={{ background: i < level - 1 ? "#0087f8" : i === level - 1 ? "#00cbff" : "#152946" }}
        />
      ))}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <AppShell>
        <DashboardContent />
      </AppShell>
    </AuthGate>
  );
}

function DashboardContent() {
  const { user, profile } = useAuth();
  const { progress, uploads, analyses } = useSellerData(user?.uid);

  const firstName = profile?.name?.split(" ")[0] ?? "";
  const day = computeTrainingDay(profile?.trainingStartDate ?? null) || 1;
  const week = weekForDay(day);
  const progressPct = profile?.progressPercent ?? 0;
  const level = progress?.currentLevel ?? profile?.currentLevel ?? 1;
  const levelInfo = LEVELS[Math.max(0, Math.min(level - 1, LEVELS.length - 1))];
  const lastAnalysis = analyses[0] ?? null;
  const hasData = analyses.length > 0;
  const sentToday = uploads.some((u) => isToday(u.createdAt));
  const analysisByUpload = new Map(analyses.map((a) => [a.uploadId, a]));

  return (
    <div className="fade-up">
      {/* Cabeçalho */}
      <div className="mb-[26px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mono-label" style={{ letterSpacing: "0.18em" }}>Treinamento comercial · 30 dias</div>
          <h1 className="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.015em] text-foreground">
            Olá, {firstName}
          </h1>
        </div>
        <div className="flex items-center gap-3.5">
          <div className="text-right">
            <div className="mono-label">Dia {day} de {TRAINING_TOTAL_DAYS}</div>
            <div className="mt-[5px] text-[13px] font-medium text-cyan">Semana {week.week} — {week.name}</div>
          </div>
          <div className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-[rgba(0,135,248,.35)] font-mono text-[15px] font-semibold text-cyan" style={{ background: "rgba(0,135,248,.09)" }}>
            {day}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="mb-3.5 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(215px, 1fr))" }}>
        {/* Progresso */}
        <div className="dc-card px-[22px] py-5">
          <div className="mono-label">Progresso</div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="font-mono text-[32px] font-semibold tracking-[-0.02em] text-foreground">{progressPct}</span>
            <span className="font-mono text-[15px] font-medium text-muted">%</span>
          </div>
          <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-indicator">
            <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: "linear-gradient(90deg,#0052b9,#0087f8,#00cbff)" }} />
          </div>
          <div className="mt-2.5 text-[11.5px] text-muted">Consistência de envio + qualidade das notas</div>
        </div>

        {/* Nota atual */}
        <div className="dc-card flex items-center gap-[18px] px-[22px] py-5">
          <ScoreRing value={lastAnalysis?.generalScore ?? null} size={84} strokeWidth={8} />
          <div>
            <div className="mono-label">Nota atual</div>
            <div className="mt-2 text-[12px] leading-[1.55] text-muted">
              Média <span className="font-semibold text-foreground">{Math.round(progress?.averageScore ?? 0)}</span> · Melhor <span className="font-semibold text-cyan">{Math.round(progress?.bestScore ?? 0)}</span>
            </div>
            {hasData && lastAnalysis && (
              <Link href={`/analise/${lastAnalysis.id}`} className="mt-2 inline-block text-[12.5px] font-semibold text-cyan hover:text-cyan-light">
                Ver última análise →
              </Link>
            )}
          </div>
        </div>

        {/* Nível */}
        <div className="dc-card px-[22px] py-5">
          <div className="flex items-center justify-between">
            <div className="mono-label">Nível</div>
            <span className="rounded-full border border-[rgba(0,203,255,.25)] px-2.5 py-1 font-mono text-[10px] font-semibold text-cyan" style={{ background: "rgba(0,203,255,.08)" }}>
              {level} / 5
            </span>
          </div>
          <div className="mt-2.5 text-[21px] font-semibold tracking-[-0.01em] text-foreground">{levelInfo.name}</div>
          <div className="mt-1.5 text-[12px] leading-[1.5] text-muted">{levelInfo.description}</div>
          <LevelBars level={level} />
        </div>
      </div>

      {/* CTA enviar */}
      <Link
        href="/upload"
        className="mb-3.5 flex w-full flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-[rgba(0,135,248,.4)] px-6 py-[22px] transition hover:border-[rgba(0,203,255,.6)]"
        style={{ background: "linear-gradient(100deg, #00173d 0%, #03112d 70%)", boxShadow: "0 12px 32px rgba(0,2,12,.35)" }}
      >
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-[rgba(0,135,248,.35)] text-cyan" style={{ background: "rgba(0,135,248,.12)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v10" /><path d="M7.5 7.5 12 3l4.5 4.5" /><path d="M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" /></svg>
          </span>
          <div>
            <div className="text-[15.5px] font-semibold text-foreground">
              {sentToday ? "Atendimento de hoje enviado ✓" : "Enviar atendimento de hoje"}
            </div>
            <div className="mt-1 text-[13px] text-muted">
              {sentToday ? "Você pode enviar mais atendimentos se quiser." : "Áudio ou vídeo do seu atendimento real — a IA analisa e te devolve o plano."}
            </div>
          </div>
        </div>
        <span className="btn-primary flex-none rounded-[10px] px-5 py-[11px] text-[13.5px] font-semibold">
          {sentToday ? "Enviar outro" : "Enviar"} →
        </span>
      </Link>

      {/* Missão + Última análise */}
      <div className="mb-3.5 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <div className="dc-card relative overflow-hidden p-[22px]">
          <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: "linear-gradient(#0087f8,#00cbff)" }} />
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00cbff" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="#00cbff" /></svg>
            <span className="mono-label text-cyan">Próxima missão</span>
          </div>
          <p className="mt-3 text-[14.5px] font-medium leading-[1.6] text-foreground">
            {lastAnalysis?.nextMission ?? "Envie seu primeiro atendimento de hoje. A IA vai analisar sua conversa e te passar a primeira missão prática."}
          </p>
          <div className="mt-3.5 text-[12px] text-muted">Foco da semana: {week.focus}</div>
        </div>

        <div className="dc-card p-[22px]">
          <div className="mono-label">Última análise</div>
          {hasData && lastAnalysis ? (
            <>
              <p className="mt-3 text-[13.5px] leading-[1.6] text-foreground">{lastAnalysis.summary}</p>
              <div className="mt-3.5 flex flex-wrap gap-2">
                <span className="rounded-full border border-[rgba(0,203,255,.22)] px-[11px] py-[5px] text-[11.5px] font-medium text-cyan" style={{ background: "rgba(0,203,255,.08)" }}>
                  {lastAnalysis.strengths.length} pontos fortes
                </span>
                <span className="rounded-full border border-[rgba(255,90,80,.22)] px-[11px] py-[5px] text-[11.5px] font-medium text-danger" style={{ background: "rgba(255,90,80,.08)" }}>
                  {lastAnalysis.mistakes.length} pontos de atenção
                </span>
              </div>
              <Link href={`/analise/${lastAnalysis.id}`} className="mt-3.5 inline-block text-[13px] font-semibold text-cyan hover:text-cyan-light">
                Ver análise completa →
              </Link>
            </>
          ) : (
            <p className="mt-3 text-[13.5px] leading-[1.6] text-muted">Nenhuma análise ainda. Assim que você enviar um atendimento, o resultado aparece aqui.</p>
          )}
        </div>
      </div>

      {/* Jornada */}
      <div className="dc-card mb-3.5 p-[22px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <span className="mono-label">Jornada de 30 dias</span>
          <span className="font-mono text-[12px] text-muted">Dia {day}/{TRAINING_TOTAL_DAYS}</span>
        </div>
        <Journey currentDay={day} />
      </div>

      {/* Envios recentes */}
      <div className="dc-card p-[22px]">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="mono-label">Envios recentes</span>
          <Link href="/historico" className="text-[12.5px] font-semibold text-cyan hover:text-cyan-light">Ver todos →</Link>
        </div>
        {uploads.length > 0 ? (
          <div>
            {uploads.slice(0, 4).map((u) => {
              const a = analysisByUpload.get(u.id);
              const pill = statusPill(u.status);
              return (
                <div key={u.id} className="flex items-center gap-3.5 border-b border-[rgba(0,45,115,.3)] px-0.5 py-3 last:border-0">
                  <span className="w-[46px] flex-none font-mono text-[12px] text-muted">{shortDate(u.createdAt)}</span>
                  <span className="flex-1 truncate text-[13.5px] text-foreground">{u.fileType === "video" ? "Vídeo" : "Áudio"} · {attendanceLabel(u.attendanceType)}</span>
                  <span className="w-[30px] flex-none text-right font-mono text-[14px] font-semibold" style={{ color: a ? scoreColor(a.generalScore) : "#6d8698" }}>
                    {a ? Math.round(a.generalScore) : "—"}
                  </span>
                  <span className="flex-none rounded-full px-2.5 py-1 font-mono text-[10.5px] font-medium tracking-[0.06em]" style={{ color: pill.color, background: pill.bg, border: `1px solid ${pill.border}` }}>
                    {pill.label}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="mb-1 mt-2.5 text-[13.5px] text-muted">Nenhum envio ainda. Seu histórico de atendimentos aparecerá aqui.</p>
        )}
      </div>

      {/* Cursos em breve */}
      <div className="mt-3.5 flex items-center gap-4 rounded-2xl border border-dashed border-[rgba(0,45,115,.7)] px-[22px] py-[18px]" style={{ background: "rgba(2,13,35,.5)" }}>
        <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] bg-indicator text-muted">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        </span>
        <div>
          <div className="text-[13.5px] font-semibold text-foreground">Cursos Simplifica — em breve</div>
          <div className="mt-0.5 text-[12.5px] text-muted">Treinamentos comerciais da Simplifica para acelerar ainda mais sua evolução.</div>
        </div>
      </div>
    </div>
  );
}
