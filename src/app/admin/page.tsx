"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminData, type SellerRow } from "@/hooks/useAdminData";
import { adminPost } from "@/lib/adminApi";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import Spinner from "@/components/Spinner";
import { LEVELS, RETENTION_DAYS, idealProgress } from "@/lib/constants";
import { shortDate } from "@/lib/training";
import { criteriaFill, initials, scoreBand, scoreColor } from "@/lib/ui";

const GRID = "1.6fr 54px 54px 1fr 64px 1.2fr 90px";

function levelName(level: number): string {
  return LEVELS[Math.max(0, Math.min(level - 1, LEVELS.length - 1))].name;
}

function Row({ row, onOpen }: { row: SellerRow; onOpen: () => void }) {
  const avg = row.progress?.averageScore ?? 0;
  const level = row.progress?.currentLevel ?? row.profile.currentLevel ?? 1;
  const pct = idealProgress(Math.round(avg));
  return (
    <button onClick={onOpen} className="grid w-full items-center gap-3 border-b border-[rgba(0,45,115,.25)] px-[22px] py-[13px] text-left transition last:border-0 hover:bg-[rgba(0,135,248,.05)]" style={{ gridTemplateColumns: GRID }}>
      <span className="flex min-w-0 items-center gap-[11px]">
        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full border border-[rgba(0,135,248,.35)] text-[10.5px] font-semibold text-cyan" style={{ background: "linear-gradient(135deg, rgba(0,82,185,.35), rgba(0,203,255,.14))" }}>{initials(row.profile.name)}</span>
        <span className="min-w-0">
          <span className="block truncate text-[13.5px] font-semibold text-foreground">{row.profile.name || "—"}</span>
          <span className="block text-[11px] text-muted">{row.profile.salesRole || "Vendedor"}</span>
        </span>
      </span>
      <span className="flex justify-center">
        <span
          className="flex h-[19px] w-[19px] items-center justify-center rounded-full text-[11px] font-bold"
          title={row.sentToday ? "Enviou hoje" : "Não enviou hoje"}
          style={
            row.sentToday
              ? { color: "#25d97d", background: "rgba(37,217,125,.12)", border: "1px solid rgba(37,217,125,.34)" }
              : { color: "#ff8d85", background: "rgba(255,90,80,.1)", border: "1px solid rgba(255,90,80,.3)" }
          }
        >
          {row.sentToday ? "✓" : "✗"}
        </span>
      </span>
      <span className="text-center font-mono text-[13px] text-foreground">{row.progress?.completedDays ?? 0}</span>
      <span className="flex items-center gap-[9px]">
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-indicator"><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: criteriaFill(avg) }} /></span>
        <span className="w-8 text-right font-mono text-[11.5px]" style={{ color: avg > 0 ? scoreColor(avg) : "#9db2c3" }}>{pct}%</span>
      </span>
      <span className="text-right font-mono text-[14px] font-semibold" style={{ color: avg > 0 ? scoreColor(avg) : "#9db2c3" }}>{avg > 0 ? Math.round(avg) : "—"}</span>
      <span><span className="inline-block whitespace-nowrap rounded-full border border-[rgba(0,203,255,.22)] px-2.5 py-1 font-mono text-[10.5px] font-medium tracking-[0.04em] text-cyan" style={{ background: "rgba(0,203,255,.07)" }}>{level} · {levelName(level)}</span></span>
      <span className="text-right font-mono text-[11.5px] text-muted">{shortDate(row.lastUpload)}</span>
    </button>
  );
}

function Kpi({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="dc-card px-[22px] py-5">
      <div className="mono-label">{label}</div>
      {children}
    </div>
  );
}

function RetentionCard() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  async function run() {
    setError("");
    setResult("");
    setRunning(true);
    try {
      const r = await adminPost<{ deleted: number; scanned: number }>(
        "/api/admin/retention",
        {}
      );
      setResult(
        r.deleted === 0
          ? "Nenhuma gravação venceu o prazo — nada a apagar."
          : `${r.deleted} gravação(ões) apagada(s). As análises foram preservadas.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na limpeza.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="dc-card mt-3.5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[640px]">
          <div className="mono-label mb-1.5">Privacidade · retenção de gravações</div>
          <p className="text-[12.5px] leading-[1.6] text-muted">
            As gravações são apagadas após <strong className="text-foreground">{RETENTION_DAYS} dias</strong>, cumprida a finalidade de gerar a análise. <strong className="text-foreground">As análises são preservadas</strong> — o histórico do vendedor não perde nada.
          </p>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="flex-none rounded-lg border border-[rgba(0,45,115,.6)] bg-card-alt px-3.5 py-2 text-[12px] font-medium text-muted transition hover:border-[rgba(0,135,248,.5)] hover:text-foreground disabled:opacity-50"
        >
          {running ? "Executando…" : "Executar limpeza agora"}
        </button>
      </div>
      {result && <p className="mt-3 rounded-[10px] border border-[rgba(0,203,255,.3)] bg-[rgba(0,203,255,.08)] px-3.5 py-2.5 text-[12.5px] text-cyan">{result}</p>}
      {error && <p className="mt-3 rounded-[10px] border border-[rgba(255,90,80,.28)] bg-[rgba(255,90,80,.08)] px-3.5 py-2.5 text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}

function AdminPanel() {
  const { profile } = useAuth();
  const router = useRouter();
  const { sellers, loading, teamAverage, sentTodayCount } = useAdminData(profile?.role === "admin");
  const sentPct = sellers.length ? Math.round((sentTodayCount / sellers.length) * 100) : 0;

  return (
    <div className="fade-up">
      <div className="mb-6">
        <div className="mono-label" style={{ letterSpacing: "0.18em" }}>Painel do gestor</div>
        <h1 className="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.015em] text-foreground">Acompanhamento da equipe</h1>
      </div>

      <div className="mb-3.5 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
        <Kpi label="Vendedores ativos">
          <div className="mt-2.5 font-mono text-[32px] font-semibold tracking-[-0.02em] text-foreground">{sellers.length}</div>
          <div className="mt-2 text-[11.5px] text-muted">em treinamento comercial</div>
        </Kpi>
        <Kpi label="Enviaram hoje">
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="font-mono text-[32px] font-semibold tracking-[-0.02em] text-foreground">{sentTodayCount}</span>
            <span className="font-mono text-[15px] text-muted">/ {sellers.length}</span>
          </div>
          <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-indicator"><div className="h-full rounded-full" style={{ width: `${sentPct}%`, background: "linear-gradient(90deg,#0087f8,#00cbff)" }} /></div>
        </Kpi>
        <Kpi label="Nota média da equipe">
          <div className="mt-2.5 flex items-baseline gap-2.5">
            <span className="font-mono text-[32px] font-semibold tracking-[-0.02em]" style={{ color: teamAverage ? scoreColor(teamAverage) : "#ffffff" }}>{teamAverage || "—"}</span>
            {teamAverage > 0 && (
              <span className="rounded-full px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: scoreColor(teamAverage), background: scoreBand(teamAverage).bg, border: `1px solid ${scoreBand(teamAverage).border}` }}>
                {scoreBand(teamAverage).label}
              </span>
            )}
          </div>
          <div className="mt-2 text-[11.5px] text-muted">meta de atendimento ideal: 85</div>
        </Kpi>
      </div>

      <div className="dc-card overflow-hidden">
        <div className="flex items-center justify-between px-[22px] pb-3.5 pt-[18px]">
          <span className="mono-label">Vendedores</span>
          <span className="text-[11.5px] text-muted">clique para ver o detalhe</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : sellers.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted">Nenhum vendedor cadastrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid items-center gap-3 border-b border-[rgba(0,45,115,.5)] px-[22px] py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted" style={{ gridTemplateColumns: GRID }}>
                <span>Vendedor</span><span className="text-center">Hoje</span><span className="text-center">Dias</span><span>Rumo ao ideal</span><span className="text-right">Média</span><span>Nível</span><span className="text-right">Último envio</span>
              </div>
              {sellers.map((row) => (
                <Row key={row.uid} row={row} onOpen={() => router.push(`/admin/${row.uid}`)} />
              ))}
            </div>
          </div>
        )}
      </div>

      <RetentionCard />
    </div>
  );
}

export default function AdminPage() {
  return (
    <AuthGate requireAdmin>
      <AppShell>
        <AdminPanel />
      </AppShell>
    </AuthGate>
  );
}
