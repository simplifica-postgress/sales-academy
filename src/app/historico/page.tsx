"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useSellerData } from "@/hooks/useSellerData";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import Spinner from "@/components/Spinner";
import { ATTENDANCE_TYPES } from "@/lib/constants";
import { shortDate } from "@/lib/training";
import { scoreColor, statusPill } from "@/lib/ui";

function attendanceLabel(value: string): string {
  return ATTENDANCE_TYPES.find((t) => t.value === value)?.label ?? value;
}

const GRID = "70px 1fr 110px 70px 120px 90px";

function History() {
  const { user } = useAuth();
  const { uploads, analyses, loading } = useSellerData(user?.uid);
  const [filter, setFilter] = useState("Todos");

  const analysisByUpload = new Map(analyses.map((a) => [a.uploadId, a]));
  const presentTypes = [...new Set(uploads.map((u) => attendanceLabel(u.attendanceType)))];
  const filters = ["Todos", ...presentTypes];
  const rows = uploads.filter((u) => filter === "Todos" || attendanceLabel(u.attendanceType) === filter);
  const scored = analyses.map((a) => a.generalScore);
  const avg = scored.length ? Math.round(scored.reduce((s, v) => s + v, 0) / scored.length) : 0;

  return (
    <div className="fade-up">
      <div className="mb-[22px] flex flex-wrap items-end justify-between gap-3.5">
        <div>
          <div className="mono-label" style={{ letterSpacing: "0.18em" }}>Seu treinamento</div>
          <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.015em] text-foreground">Histórico de envios</h1>
        </div>
        <Link href="/upload" className="btn-primary rounded-[10px] px-[18px] py-2.5 text-[13px] font-semibold">+ Novo envio</Link>
      </div>

      {uploads.length > 1 && filters.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.map((f) => {
            const active = filter === f;
            return (
              <button key={f} onClick={() => setFilter(f)} className="rounded-full px-3.5 py-[7px] text-[12.5px] font-medium transition" style={{
                border: `1px solid ${active ? "rgba(0,135,248,.5)" : "rgba(0,45,115,.55)"}`,
                background: active ? "rgba(0,135,248,.12)" : "#020d23",
                color: active ? "#00cbff" : "#9db2c3",
              }}>{f}</button>
            );
          })}
        </div>
      )}

      {loading ? (
        <div className="dc-card flex justify-center py-12"><Spinner /></div>
      ) : uploads.length === 0 ? (
        <div className="dc-card px-6 py-12 text-center">
          <p className="text-[13.5px] text-muted">Você ainda não enviou nenhum atendimento.</p>
          <Link href="/upload" className="btn-primary mt-4 inline-block rounded-[10px] px-5 py-[11px] text-[13px] font-semibold">Enviar o primeiro</Link>
        </div>
      ) : (
        <>
          <div className="dc-card overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[640px]">
                <div className="grid items-center gap-3 border-b border-[rgba(0,45,115,.5)] px-[22px] py-3.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted" style={{ gridTemplateColumns: GRID }}>
                  <span>Data</span><span>Atendimento</span><span>Formato</span><span className="text-right">Nota</span><span className="text-center">Status</span><span />
                </div>
                {rows.map((u) => {
                  const a = analysisByUpload.get(u.id);
                  const pill = statusPill(u.status);
                  return (
                    <div key={u.id} className="grid items-center gap-3 border-b border-[rgba(0,45,115,.25)] px-[22px] py-[13px] transition last:border-0 hover:bg-[rgba(0,135,248,.04)]" style={{ gridTemplateColumns: GRID }}>
                      <span className="font-mono text-[12px] text-muted">{shortDate(u.createdAt)}</span>
                      <span className="text-[13.5px] text-foreground">{attendanceLabel(u.attendanceType)}</span>
                      <span className="text-[12.5px] text-muted">{u.fileType === "video" ? "Vídeo" : "Áudio"}</span>
                      <span className="text-right font-mono text-[14px] font-semibold" style={{ color: a ? scoreColor(a.generalScore) : "#9db2c3" }}>{a ? Math.round(a.generalScore) : "—"}</span>
                      <span className="text-center"><span className="inline-block rounded-full px-2.5 py-1 font-mono text-[10.5px] font-medium tracking-[0.06em]" style={{ color: pill.color, background: pill.bg, border: `1px solid ${pill.border}` }}>{pill.label}</span></span>
                      <span className="text-right">{a && <Link href={`/analise/${a.id}`} className="text-[12px] font-semibold text-cyan hover:text-cyan-light">Ver análise</Link>}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* "média geral" de propósito: o dashboard mostra a média dos
              últimos 5 envios. Nomes diferentes para números diferentes. */}
          <p className="mt-3.5 text-center text-[12px] text-muted">{uploads.length} envios no total{avg > 0 && <> · média geral <span className="font-semibold" style={{ color: scoreColor(avg) }}>{avg}</span></>}</p>
        </>
      )}
    </div>
  );
}

export default function HistoryPage() {
  return (
    <AuthGate>
      <AppShell>
        <History />
      </AppShell>
    </AuthGate>
  );
}
