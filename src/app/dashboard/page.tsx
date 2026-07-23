"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useSellerData } from "@/hooks/useSellerData";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import ScoreRing from "@/components/ScoreRing";
import {
  ATTENDANCE_TYPES,
  IDEAL_SCORE_THRESHOLD,
  LEVELS,
  WEEKLY_GOALS,
  idealProgress,
  trainingWeek,
  weeklyGoal,
} from "@/lib/constants";
import { RECENT_WINDOW, nextLevelNeed, type NextLevelNeed } from "@/lib/progression";
import { isToday, shortDate } from "@/lib/training";
import { scoreBand, scoreColor, statusPill } from "@/lib/ui";

function attendanceLabel(value: string): string {
  return ATTENDANCE_TYPES.find((t) => t.value === value)?.label ?? value;
}

/** "Falta X e Y para o Nível N" — deixa claro o que trava a subida. */
function needText(n: NextLevelNeed): string | null {
  const parts: string[] = [];
  if (n.daysMissing > 0) {
    parts.push(`${n.daysMissing} ${n.daysMissing === 1 ? "dia enviado" : "dias enviados"}`);
  }
  if (n.averageMissing > 0) parts.push(`+${n.averageMissing} de média`);
  if (n.needsIdeal) parts.push("3 dias seguidos acima de 85");
  if (parts.length === 0) return null;
  return `Falta ${parts.join(" e ")} para o Nível ${n.level}`;
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
  const need = nextLevelNeed(
    level,
    avgScore,
    daysActive,
    progress?.idealAttendanceReached ?? false
  );
  const levelNeedText = need ? needText(need) : null;
  // Menos de 5 dias de treino: a média ainda não é um retrato confiável.
  const provisional = daysActive > 0 && daysActive < RECENT_WINDOW;

  // Meta da semana: escada 20 → 30 → … → 85, que sobe a cada 5 dias de
  // treino. A meta é um ALVO DE CURTO PRAZO; a barra continua medindo a nota
  // real (0 → 85), com a meta marcada em cima dela.
  const week = trainingWeek(daysActive);
  const goal = weeklyGoal(daysActive);
  const goalReached = avgScore >= goal;
  // Já bateu a meta da semana? O alvo mostrado passa a ser o próximo degrau,
  // senão o vendedor ficaria olhando para um número que já superou.
  const activeGoal = goalReached
    ? (WEEKLY_GOALS.find((g) => g > avgScore) ?? IDEAL_SCORE_THRESHOLD)
    : goal;
  const idealPct = idealProgress(avgScore);
  const goalMarkPct = Math.min((goal / IDEAL_SCORE_THRESHOLD) * 100, 100);

  return (
    <div className="fade-up">
      {/* Cabeçalho — no celular empilha (saudação, depois o nível). */}
      <div className="mb-[18px] flex flex-col gap-3 min-[560px]:flex-row min-[560px]:flex-wrap min-[560px]:items-center min-[560px]:justify-between">
        <div>
          <div className="mono-label" style={{ letterSpacing: "0.18em" }}>Treinamento comercial · Simplifica</div>
          <h1 className="mt-[7px] text-[24px] font-semibold leading-tight tracking-[-0.015em] text-foreground min-[560px]:text-[26px]">
            Olá, {firstName} 👋
          </h1>
        </div>
        <div className="flex flex-col items-start gap-1.5 min-[560px]:items-end">
          <span className="inline-flex items-center gap-2 rounded-full border border-[rgba(127,155,255,.28)] px-3.5 py-2 text-[12px] font-semibold text-cyan" style={{ background: "rgba(127,155,255,.08)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3l2.4 6.3L21 9.6l-5 4.3 1.6 6.5L12 16.9 6.4 20.4 8 13.9l-5-4.3 6.6-.3z" /></svg>
            Nível {level} de 5 · {levelInfo.name}
          </span>
          {levelNeedText && (
            <span className="text-[11.5px] font-medium text-muted">{levelNeedText}</span>
          )}
        </div>
      </div>

      {/* Hero: sequência de envios + progresso até o atendimento ideal */}
      <section className="relative mb-4 overflow-hidden rounded-[22px] p-px" style={{ background: "linear-gradient(150deg, rgba(90,124,255,.55), rgba(120,150,210,.12) 45%, rgba(127,155,255,.3))", boxShadow: "0 22px 60px rgba(0,2,12,.5)" }}>
        <div className="relative rounded-[21px]" style={{ padding: "clamp(24px,4vw,40px) clamp(22px,4vw,44px)", background: "radial-gradient(760px 340px at 82% -30%, rgba(90,124,255,.22), transparent 62%), linear-gradient(120deg, #151f3c 0%, #0b1124 60%)" }}>
          {/* No celular os dois blocos empilham à esquerda, separados por um
              divisor; lado a lado só a partir de 560px. */}
          <div className="flex flex-col gap-4 min-[560px]:flex-row min-[560px]:items-end min-[560px]:justify-between min-[560px]:gap-5">
            <div>
              <div className="text-[10.5px] font-semibold uppercase tracking-[0.2em] text-cyan">Sua sequência de envios</div>
              <div className="mt-3 flex items-baseline gap-3">
                <span className="font-semibold leading-none text-foreground" style={{ fontSize: "clamp(52px,13vw,92px)", letterSpacing: "-0.04em", textShadow: "0 4px 40px rgba(90,124,255,.4)" }}>
                  {sendStreak}<span className="text-muted" style={{ fontSize: "0.32em" }}> {sendStreak === 1 ? "dia" : "dias"}</span>
                </span>
                <div className="pb-1.5">
                  <div className="text-[19px] font-semibold leading-none text-foreground min-[560px]:text-[22px]">{sendStreak > 0 ? "seguidos 🔥" : "vamos começar"}</div>
                  <div className="mt-2 inline-flex items-baseline gap-1.5 rounded-lg border border-[rgba(127,155,255,.28)] px-2.5 py-1.5" style={{ background: "rgba(127,155,255,.08)" }}>
                    <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-muted">Dias enviados</span>
                    <span className="text-[20px] font-semibold leading-none text-cyan">{daysActive}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Divisor só no celular (some quando vira lado a lado). */}
            <div className="h-px w-full bg-[rgba(120,150,210,.14)] min-[560px]:hidden" />

            <div className="text-left min-[560px]:text-right">
              {/* Batida a meta da semana, o rótulo muda: seria mentira dizer
                  "meta da semana 1" exibindo um número que não é o da semana 1. */}
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                {goalReached && avgScore > 0 ? "Próximo alvo" : `Meta da semana ${week}`}
              </div>
              <div className="mt-1.5 flex items-baseline gap-1.5 min-[560px]:justify-end">
                <span className="text-[26px] font-semibold text-foreground">{activeGoal}</span>
                <span className="text-[13px] text-muted">de nota</span>
              </div>
              <div className="mt-0.5 text-[12.5px] font-medium" style={{ color: goalReached && avgScore > 0 ? "#57c98a" : "#7f9bff" }}>
                {avgScore === 0
                  ? "envie o primeiro atendimento"
                  : goalReached
                    ? `meta da semana ${week} batida ✓`
                    : `faltam ${activeGoal - avgScore} pontos`}
              </div>
            </div>
          </div>

          {/* Barra: a régua é sempre a nota (0 → 85). A meta da semana é um
              MARCADOR sobre ela, não outra régua — assim o preenchimento nunca
              contradiz a faixa da média (uma média fraca não enche a barra). */}
          <div className="relative mb-2 mt-[38px] px-0.5">
            <div className="relative h-4 overflow-hidden rounded-full border border-[rgba(120,150,210,.18)]" style={{ background: "#131b33" }}>
              <div
                className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                style={{
                  width: `${idealPct}%`,
                  background: "linear-gradient(90deg,#4a6edc,#5a7cff 55%,#9db2ff)",
                  boxShadow: "0 0 24px rgba(127,155,255,.5)",
                  opacity: provisional ? 0.55 : 1,
                }}
              />
            </div>

            {/* Marcador da meta: haste atravessando a trilha + etiqueta.
                O anel escuro em volta da haste faz ela continuar legível tanto
                sobre a parte preenchida quanto sobre a vazia da barra. */}
            {avgScore > 0 && (
              <div
                className="pointer-events-none absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${goalMarkPct}%`, zIndex: 2 }}
              >
                <span
                  className="mx-auto block h-[24px] w-[2px] rounded-full"
                  style={{
                    background: goalReached ? "#57c98a" : "#ffffff",
                    boxShadow: `0 0 0 2.5px ${goalReached ? "rgba(7,11,22,.6)" : "rgba(7,11,22,.6)"}`,
                  }}
                />
                <span
                  className="absolute left-1/2 top-[30px] -translate-x-1/2 inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-[3px] text-[10px] font-semibold"
                  style={
                    goalReached
                      ? { color: "#57c98a", background: "rgba(87,201,138,.13)", border: "1px solid rgba(87,201,138,.4)" }
                      : { color: "#cdd5e6", background: "rgba(11,17,36,.85)", border: "1px solid rgba(120,150,210,.28)" }
                  }
                >
                  {goalReached && <span aria-hidden>✓</span>}
                  meta {goal}
                </span>
              </div>
            )}

            <div
              className="absolute top-1/2 h-[30px] w-[30px] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-cyan bg-white"
              style={{ left: `${idealPct}%`, boxShadow: "0 0 0 6px rgba(127,155,255,.18), 0 6px 18px rgba(0,2,12,.6)", zIndex: 3 }}
            />
          </div>

          <div className="relative mt-[34px] flex items-center justify-between text-[11px] font-medium text-muted">
            <span>
              Sua média:{" "}
              <span className="font-semibold" style={{ color: avgScore ? scoreColor(avgScore) : undefined }}>
                {avgScore || "—"}
              </span>
              {provisional && <span className="text-dim"> · provisória</span>}
            </span>
            <span className="text-cyan">Atendimento ideal · 85</span>
          </div>

          {/* Stats: no celular um grid 2×2 limpo (sem os traços verticais, que
              só fazem sentido numa linha); no desktop volta a linha única com
              divisores. */}
          <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-5 border-t border-[rgba(120,150,210,.15)] pt-[22px] min-[560px]:mt-8 min-[560px]:grid-cols-4 min-[560px]:pt-[26px]">
            <div className="flex items-center gap-3">
              <ScoreRing value={lastAnalysis?.generalScore ?? null} size={52} strokeWidth={6} />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Último envio</div>
                {hasData && lastAnalysis && (
                  <Link href={`/analise/${lastAnalysis.id}`} className="mt-1.5 inline-block text-[12px] font-semibold text-cyan hover:text-cyan-light">Ver análise →</Link>
                )}
              </div>
            </div>
            <div className="min-[560px]:border-l min-[560px]:border-[rgba(120,150,210,.13)] min-[560px]:pl-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Média · {RECENT_WINDOW} dias</div>
              <div className="mt-1.5 flex items-baseline gap-2">
                <span className="text-[24px] font-semibold" style={{ color: avgScore ? scoreColor(avgScore) : "#79839c" }}>{avgScore}</span>
                {avgScore > 0 && (
                  <span className="text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: scoreColor(avgScore) }}>{scoreBand(avgScore).label}</span>
                )}
              </div>
              {daysActive > 0 && daysActive < RECENT_WINDOW && (
                <div className="mt-1 text-[10.5px] text-muted">provisória · {daysActive} de {RECENT_WINDOW}</div>
              )}
            </div>
            <div className="min-[560px]:border-l min-[560px]:border-[rgba(120,150,210,.13)] min-[560px]:pl-3.5">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Melhor nota</div>
              <div className="mt-1.5 text-[24px] font-semibold" style={{ color: bestScore ? scoreColor(bestScore) : "#79839c" }}>{bestScore}</div>
            </div>
            <div className="min-[560px]:border-l min-[560px]:border-[rgba(120,150,210,.13)] min-[560px]:pl-3.5">
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
        className="mb-3.5 flex w-full flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-[rgba(90,124,255,.4)] px-6 py-[22px] transition hover:border-[rgba(127,155,255,.6)]"
        style={{ background: "linear-gradient(100deg, #151f3c 0%, #0b1124 70%)", boxShadow: "0 12px 32px rgba(0,2,12,.35)" }}
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
              {sentToday
                ? "Pode enviar mais: a IA analisa todos. A nota do dia continua sendo a do primeiro."
                : "Áudio ou vídeo do seu atendimento real — a IA analisa e te devolve o plano."}
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
          <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: "linear-gradient(#5a7cff,#7f9bff)" }} />
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#7f9bff" strokeWidth="2"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="#7f9bff" /></svg>
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
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(87,201,138,.34)] px-[11px] py-[5px] text-[11.5px] font-semibold text-success" style={{ background: "rgba(87,201,138,.1)" }}>
                  <span aria-hidden>✓</span> {lastAnalysis.strengths.length} pontos fortes
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[rgba(244,114,106,.34)] px-[11px] py-[5px] text-[11.5px] font-semibold text-danger" style={{ background: "rgba(244,114,106,.1)" }}>
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
                <div key={u.id} className="flex items-center gap-3.5 border-b border-[rgba(120,150,210,.10)] px-0.5 py-3 last:border-0">
                  <span className="w-[46px] flex-none font-mono text-[12px] text-muted">{shortDate(u.createdAt)}</span>
                  <span className="flex-1 truncate text-[13.5px] text-foreground">{u.fileType === "video" ? "Vídeo" : "Áudio"} · {attendanceLabel(u.attendanceType)}</span>
                  <span className="w-[30px] flex-none text-right font-mono text-[14px] font-semibold" style={{ color: a ? scoreColor(a.generalScore) : "#79839c" }}>
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
      <div className="mt-3.5 flex items-center gap-4 rounded-2xl border border-dashed border-[rgba(120,150,210,.18)] px-[22px] py-[18px]" style={{ background: "rgba(2,13,35,.5)" }}>
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
