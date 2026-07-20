"use client";

import { useRouter } from "next/navigation";
import { useAdminData, type SellerRow, type TeamScope } from "@/hooks/useAdminData";
import Spinner from "@/components/Spinner";
import { LEVELS } from "@/lib/constants";
import { shortDate } from "@/lib/training";
import { criteriaFill, initials, scoreBand, scoreColor } from "@/lib/ui";

const GRID = "1.6fr 54px 54px 1fr 64px 1.2fr 90px";

function levelName(level: number): string {
  return LEVELS[Math.max(0, Math.min(level - 1, LEVELS.length - 1))].name;
}

function Row({ row, onOpen }: { row: SellerRow; onOpen: () => void }) {
  const avg = row.progress?.averageScore ?? 0;
  const level = row.progress?.currentLevel ?? row.profile.currentLevel ?? 1;
  const pct = avg > 0 ? Math.min(Math.round((avg / 85) * 100), 100) : 0;
  return (
    <button onClick={onOpen} className="grid w-full items-center gap-3 border-b border-[rgba(120,150,210,.09)] px-[22px] py-[13px] text-left transition last:border-0 hover:bg-[rgba(90,124,255,.05)]" style={{ gridTemplateColumns: GRID }}>
      <span className="flex min-w-0 items-center gap-[11px]">
        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full border border-[rgba(90,124,255,.35)] text-[10.5px] font-semibold text-cyan" style={{ background: "linear-gradient(135deg, rgba(74,110,220,.35), rgba(127,155,255,.14))" }}>{initials(row.profile.name)}</span>
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
              ? { color: "#57c98a", background: "rgba(87,201,138,.12)", border: "1px solid rgba(87,201,138,.34)" }
              : { color: "#f4726a", background: "rgba(244,114,106,.1)", border: "1px solid rgba(244,114,106,.3)" }
          }
        >
          {row.sentToday ? "✓" : "✗"}
        </span>
      </span>
      <span className="text-center font-mono text-[13px] text-foreground">{row.progress?.completedDays ?? 0}</span>
      <span className="flex items-center gap-[9px]">
        <span className="h-1 flex-1 overflow-hidden rounded-full bg-indicator"><span className="block h-full rounded-full" style={{ width: `${pct}%`, background: criteriaFill(avg) }} /></span>
        <span className="w-8 text-right font-mono text-[11.5px]" style={{ color: avg > 0 ? scoreColor(avg) : "#79839c" }}>{pct}%</span>
      </span>
      <span className="text-right font-mono text-[14px] font-semibold" style={{ color: avg > 0 ? scoreColor(avg) : "#79839c" }}>{avg > 0 ? Math.round(avg) : "—"}</span>
      <span><span className="inline-block whitespace-nowrap rounded-full border border-[rgba(127,155,255,.22)] px-2.5 py-1 font-mono text-[10.5px] font-medium tracking-[0.04em] text-cyan" style={{ background: "rgba(127,155,255,.07)" }}>{level} · {levelName(level)}</span></span>
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

/**
 * Painel de acompanhamento de uma equipe. Usado tanto pelo gestor (na própria
 * empresa) quanto pelo master (ao abrir a pasta de uma empresa).
 */
export default function TeamPanel({
  scope,
  emptyLabel = "Nenhum vendedor nesta empresa ainda.",
}: {
  scope: TeamScope | null;
  emptyLabel?: string;
}) {
  const router = useRouter();
  const { sellers, loading, teamAverage, sentTodayCount } = useAdminData(scope);
  const sentPct = sellers.length ? Math.round((sentTodayCount / sellers.length) * 100) : 0;

  return (
    <>
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
          <div className="mt-3 h-[5px] overflow-hidden rounded-full bg-indicator"><div className="h-full rounded-full" style={{ width: `${sentPct}%`, background: "linear-gradient(90deg,#5a7cff,#7f9bff)" }} /></div>
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
          <p className="px-6 py-10 text-center text-sm text-muted">{emptyLabel}</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid items-center gap-3 border-b border-[rgba(120,150,210,.14)] px-[22px] py-2.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted" style={{ gridTemplateColumns: GRID }}>
                <span>Vendedor</span><span className="text-center">Hoje</span><span className="text-center">Dias</span><span>Rumo ao ideal</span><span className="text-right">Média</span><span>Nível</span><span className="text-right">Último envio</span>
              </div>
              {sellers.map((row) => (
                <Row key={row.uid} row={row} onOpen={() => router.push(`/admin/${row.uid}`)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
