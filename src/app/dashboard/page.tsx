"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useSellerData } from "@/hooks/useSellerData";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import ScoreRing from "@/components/ScoreRing";
import { ATTENDANCE_TYPES, LEVELS, idealProgress } from "@/lib/constants";
import { isToday, shortDate } from "@/lib/training";
import { scoreBand, scoreColor, statusPill } from "@/lib/ui";

function attendanceLabel(value: string): string {
  return ATTENDANCE_TYPES.find((t) => t.value === value)?.label ?? value;
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
  const avgScore = Math.round(progress?.averageScore ?? 0);
  // Barra derivada da média ao vivo — sempre bate com a média exibida.
  const progressPct = idealProgress(avgScore);
  const level = progress?.currentLevel ?? profile?.currentLevel ?? 1;
  const levelInfo = LEVELS[Math.max(0, Math.min(level - 1, LEVELS.length - 1))];
  const lastAnalysis = analyses[0] ?? null;
  const hasData = analyses.length > 0;
  const sentToday = uploads.some((u) => isToday(u.createdAt));
  const analysisByUpload = new Map(analyses.map((a) => [a.uploadId, a]));

  const bestScore = Math.round(progress?.bestScore ?? 0);
  const sendStreak = progress?.sendStreak ?? 0;
  const daysActive = progress?.completedDays ?? 0;
  const totalSends = progress?.totalUploads ?? uploads.length;

  return (
    <div className="fade-up">
      {/* Cabeçalho */}
      <div className="mb-[18px] flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="mono-label" style={{ letterSpacing: "0.18em" }}>Treinamento comercial · Simplifica</div>
          <h1 className="mt-[7px] text-[26px] font-semibold leading-tight tracking-[-0.015em] text-foreground">
            Olá, {firstName} 👋
          </h1>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(0,203,255,.28)] px-3.5 py-2 text-[12px] font-semibold text-cyan" style={{ background: "rgba(0,203,255,.08)" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l2.4 6.3L21 9.6l-5 4.3 1.6 6.5L12 16.9 6.4 20.4 8 13.9l-5-4.3 6.6-.3z" /></svg>
          Nível {level} de 5 · {levelInfo.name}
        </span>
      </div>

      {/* Hero: sequência de envios + progresso até o atendimento ideal */}
      <section className="relative mb-4 overflow-hidden rounded-[22px] p-px" style={{ background: "linear-gradient(150deg, rgba(0,135,248,.55), rgba(0,45,115,.4) 45%, rgba(0,203,255,.3))", boxShadow: "0 22px 60px rgba(0,2,12,.5)" }}>
        <div className="relative rounded-[21px]" style={{ padding: "clamp(24px,4vw,40px) clamp(22px,4vw,44px)", background: "radial-gradient(760px 340px at 82% -30%, rgba(0,135,248,.22), transparent 62%), linear-gradient(120deg, #00173d 0%, #03112d 60%)" }}>
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-cyan">Sua sequência de envios</div>
              <div className="mt-3.5 flex items-baseline gap-3">
                <span className="font-semibold leading-none text-foreground" style={{ fontSize: "clamp(56px,10vw,92px)", letterSpacing: "-0.04em", textShadow: "0 4px 40px rgba(0,135,248,.4)" }}>
                  {sendStreak}<span className="text-muted" style={{ fontSize: "0.34em" }}> {sendStreak === 1 ? "dia" : "dias"}</span>
                </span>
                <div className="pb-2.5">
                  <div className="text-[22px] font-semibold leading-none text-foreground">{sendStreak > 0 ? "seguidos 🔥" : "vamos começar"}</div>
                  <div className="mt-2 inline-flex items-baseline gap-1.5 rounded-lg border border-[rgba(0,203,255,.28)] px-3 py-1.5" style={{ background: "rgba(0,203,255,.08)" }}>
                    <span className="text-[12px] font-medium uppercase tracking-[0.1em] text-muted">Dias enviados</span>
                    <span className="text-[22px] font-semibold leading-none text-cyan">{daysActive}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Rumo ao ideal</div>
              <div className="mt-1.5 text-[26px] font-semibold text-foreground">{progressPct}<span className="text-[16px] text-muted">%</span></div>
              <div className="mt-0.5 text-[12.5px] font-medium text-cyan">meta 85</div>
            </div>
          </div>

          {/* Barra: quão perto a média está do atendimento ideal */}
          <div className="relative mb-2 mt-[38px] px-0.5">
            <div className="relative h-4 overflow-hidden rounded-full border border-[rgba(0,45,115,.7)]" style={{ background: "#0a1c38" }}>
              <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${progressPct}%`, background: "linear-gradient(90deg,#0052b9,#0087f8 55%,#00e3ff)", boxShadow: "0 0 24px rgba(0,203,255,.5)" }} />
            </div>
            <div className="absolute top-1/2 h-[30px] w-[30px] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-cyan bg-white" style={{ left: `${progressPct}%`, boxShadow: "0 0 0 6px rgba(0,203,255,.18), 0 6px 18px rgba(0,2,12,.6)", zIndex: 3 }} />
          </div>
          <div className="relative mt-3 flex justify-between text-[11px] font-medium text-muted">
            <span>Começo</span>
            <span className="text-cyan">Atendimento ideal · nota 85</span>
          </div>

          {/* Stats compactos */}
          <div className="mt-8 grid gap-3.5 border-t border-[rgba(0,45,115,.55)] pt-[26px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))" }}>
            <div className="flex items-center gap-3.5">
              <ScoreRing value={lastAnalysis?.generalScore ?? null} size={56} strokeWidth={6} />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Nota atual</div>
                {hasData && lastAnalysis && (
                  <Link href={`/analise/${lastAnalysis.id}`} className="mt-1.5 inline-block text-[12px] font-semibold text-cyan hover:text-cyan-light">Ver análise →</Link>
                )}
              </div>
            </div>
            <div className="border-l border-[rgba(0,45,115,.45)] pl-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Média</div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-[24px] font-semibold" style={{ color: avgScore ? scoreColor(avgScore) : "#9db2c3" }}>{avgScore}</span>
                {avgScore > 0 && (
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: scoreColor(avgScore) }}>{scoreBand(avgScore).label}</span>
                )}
              </div>
            </div>
            <div className="border-l border-[rgba(0,45,115,.45)] pl-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Melhor nota</div>
              <div className="mt-1.5 text-[24px] font-semibold" style={{ color: bestScore ? scoreColor(bestScore) : "#9db2c3" }}>{bestScore}</div>
            </div>
            <div className="border-l border-[rgba(0,45,115,.45)] pl-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Total de envios</div>
              <div className="mt-1.5 flex items-baseline gap-1.5"><span className="text-[24px] font-semibold text-foreground">{totalSends}</span><span className="text-[12px] font-medium text-muted">atend.</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Dica de rolagem */}
      <div className="mb-4 mt-0.5 flex items-center justify-center gap-2 text-[11.5px] font-medium tracking-[0.08em] text-muted">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" style={{ animation: "pulseSoft 2s infinite" }}><path d="M12 5v14" /><path d="M6 13l6 6 6-6" /></svg>
        role para ver missão, análises e histórico
      </div>

      {/* CTA enviar */}
      <Link
        href="/upload"
        className="mb-3.5 flex w-full flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-[rgba(0,135,248,.4)] px-6 py-[22px] transition hover:border-[rgba(0,203,255,.6)]"
        style={{ background: "linear-gradient(100deg, #00173d 0%, #03112d 70%)", boxShadow: "0 12px 32px rgba(0,2,12,.35)" }}
      >
        <div className="flex items-center gap-4">
          <span className="flex h-11 w-11 flex-none items-center justify-center rounded-xl border border-[rgba(255,255,255,.9)] bg-white text-primary">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v10" /><path d="M7.5 7.5 12 3l4.5 4.5" /><path d="M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" /></svg>
          </span>
          <div>
            <div className="text-[15.5px] font-semibold text-foreground">
              {sentToday ? "Atendimento de hoje enviado ✓" : "Enviar um atendimento"}
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
            {lastAnalysis?.nextMission ?? "Envie seu primeiro atendimento. A IA vai analisar sua conversa e te passar a primeira missão prática."}
          </p>
        </div>

        <div className="dc-card p-[22px]">
          <div className="mono-label">Última análise</div>
          {hasData && lastAnalysis ? (
            <>
              <p className="mt-3 text-[13.5px] leading-[1.6] text-foreground">{lastAnalysis.summary}</p>
              <div className="mt-3.5 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(37,217,125,.34)] px-[11px] py-[5px] text-[11.5px] font-semibold text-success" style={{ background: "rgba(37,217,125,.1)" }}>
                  <span aria-hidden>✓</span> {lastAnalysis.strengths.length} pontos fortes
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(255,90,80,.34)] px-[11px] py-[5px] text-[11.5px] font-semibold text-danger" style={{ background: "rgba(255,90,80,.1)" }}>
                  <span aria-hidden>!</span> {lastAnalysis.mistakes.length} pontos de atenção
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
                  <span className="w-[30px] flex-none text-right font-mono text-[14px] font-semibold" style={{ color: a ? scoreColor(a.generalScore) : "#9db2c3" }}>
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
