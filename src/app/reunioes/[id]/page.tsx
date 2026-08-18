"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ScoreRing from "@/components/ScoreRing";
import Spinner from "@/components/Spinner";
import { criteriaFill, scoreBand } from "@/lib/ui";
import { CRITERIOS_REUNIAO, type CriterioReuniao } from "@/lib/reunioes";

type Analise = {
  id: string;
  titulo: string;
  participantes: string;
  contexto: string;
  transcricao: string;
  resumo: string;
  momentoDecisivo: string;
  acertos: string[];
  erros: string[];
  perdidas: string[];
  notas: Record<CriterioReuniao, number>;
  focoDaProxima: CriterioReuniao;
  proximaAcao: string;
  probabilidadeFechamento: "alta" | "media" | "baixa";
  notaGeral: number;
  criadoEm: string | null;
};

const PROB = {
  alta: { texto: "Alta chance de fechar", cor: "#57c98a", fundo: "rgba(87,201,138,.1)", borda: "rgba(87,201,138,.34)" },
  media: { texto: "Chance média de fechar", cor: "#f5c163", fundo: "rgba(245,193,99,.1)", borda: "rgba(245,193,99,.34)" },
  baixa: { texto: "Chance baixa de fechar", cor: "#f4726a", fundo: "rgba(244,114,106,.1)", borda: "rgba(244,114,106,.34)" },
} as const;

/** Lista com marcador colorido — mesmo padrão dos blocos da análise do atendimento. */
function Lista({ itens }: { itens: string[] }) {
  if (!itens?.length) return <p className="text-[13px] text-muted">—</p>;
  return (
    <ul className="flex flex-col gap-3">
      {itens.map((t, i) => (
        <li key={i} className="text-[13.5px] leading-[1.65] text-foreground">
          {t}
        </li>
      ))}
    </ul>
  );
}

export default function AnaliseReuniaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [analise, setAnalise] = useState<Analise | null>(null);
  const [erro, setErro] = useState("");
  const [verTranscricao, setVerTranscricao] = useState(false);

  useEffect(() => {
    fetch(`/api/reunioes/lista?id=${encodeURIComponent(id)}`)
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error ?? "Não foi possível carregar.");
        setAnalise(d.analise);
      })
      .catch((e) => setErro(e instanceof Error ? e.message : "Falha ao carregar."));
  }, [id]);

  if (erro) {
    return (
      <main className="mx-auto w-full max-w-[560px] px-5 py-12">
        <div className="dc-card p-7 text-center">
          <p className="text-[13.5px] text-danger">{erro}</p>
          <button
            onClick={() => router.push("/reunioes")}
            className="btn-primary mt-4 rounded-[11px] px-5 py-2.5 text-sm font-semibold"
          >
            Voltar
          </button>
        </div>
      </main>
    );
  }

  if (!analise) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const p = PROB[analise.probabilidadeFechamento] ?? PROB.baixa;
  const foco = CRITERIOS_REUNIAO.find((c) => c.key === analise.focoDaProxima);

  return (
    <main className="fade-up mx-auto w-full max-w-[1000px] px-4 py-8 lg:px-8">
      <button
        onClick={() => router.push("/reunioes")}
        className="mb-4 inline-flex items-center gap-2 rounded-lg border border-[rgba(120,150,210,.16)] bg-card-alt px-3.5 py-2 text-[12.5px] font-medium text-muted transition hover:border-[rgba(90,124,255,.5)] hover:text-foreground"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        Todas as reuniões
      </button>

      <div className="mb-6">
        <div className="mono-label" style={{ letterSpacing: "0.18em" }}>
          Análise de reunião
        </div>
        <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.015em] text-foreground">
          {analise.titulo}
        </h1>
        <p className="mt-1.5 text-[13px] text-muted">
          {analise.participantes || "—"}
          {analise.criadoEm
            ? ` · ${new Date(analise.criadoEm).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}`
            : ""}
        </p>
      </div>

      {/* Anel + resumo — mesmo bloco de cabeçalho da análise do atendimento */}
      <div className="dc-card mb-3.5 flex flex-wrap items-center gap-7 p-[26px]">
        <div className="mx-auto flex-none">
          <ScoreRing value={analise.notaGeral} size={148} strokeWidth={11} sublabel="de 100" />
        </div>
        <div className="min-w-[260px] flex-1">
          <div className="mono-label">Resumo da reunião</div>
          <p className="mt-2.5 text-[14px] leading-[1.65] text-foreground">{analise.resumo}</p>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <span
              className="inline-flex items-center rounded-full px-[11px] py-[5px] font-mono text-[11.5px] font-semibold"
              style={{ color: p.cor, background: p.fundo, border: `1px solid ${p.borda}` }}
            >
              {p.texto}
            </span>
          </div>
        </div>
      </div>

      {/* Momento decisivo: o que o time mais precisa enxergar numa reunião */}
      <div
        className="dc-card mb-3.5 overflow-hidden p-6"
        style={{
          borderTop: "1.5px solid rgba(127,155,255,.5)",
          background: "linear-gradient(180deg, rgba(20,28,54,.55), rgba(11,16,32,.5))",
        }}
      >
        <div className="mb-3.5 flex items-center gap-2">
          <span
            className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[12px] font-bold text-cyan"
            style={{ background: "rgba(127,155,255,.12)", border: "1px solid rgba(127,155,255,.34)" }}
            aria-hidden
          >
            !
          </span>
          <span className="mono-label text-cyan">Momento decisivo</span>
        </div>
        <p className="text-[13.5px] leading-[1.7] text-foreground">{analise.momentoDecisivo}</p>
      </div>

      {/* Notas por critério — mesmo layout em grade da análise do atendimento */}
      <div className="dc-card mb-3.5 p-6">
        <div className="mono-label mb-[18px]">Nota por critério</div>
        <div className="grid gap-x-11 gap-y-[26px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
          {CRITERIOS_REUNIAO.map((c) => {
            const nota = analise.notas?.[c.key] ?? 0;
            const band = scoreBand(nota);
            return (
              <div key={c.key}>
                <div className="mb-[7px] flex items-baseline justify-between gap-2.5">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="flex h-[17px] w-[17px] flex-none items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ color: band.color, background: band.bg, border: `1px solid ${band.border}` }}
                      aria-hidden
                    >
                      {band.icon}
                    </span>
                    <span className="text-[13px] leading-snug text-foreground" title={c.ajuda}>
                      {c.label}
                    </span>
                  </span>
                  <span className="flex flex-none items-baseline gap-1.5">
                    <span className="font-mono text-[10.5px] text-muted">peso {c.peso}</span>
                    <span className="font-mono text-[14px] font-semibold" style={{ color: band.color }}>
                      {nota}
                    </span>
                  </span>
                </div>
                <div className="h-[5px] overflow-hidden rounded-full bg-indicator">
                  <div className="h-full rounded-full" style={{ width: `${nota}%`, background: criteriaFill(nota) }} />
                </div>
                <div className="mt-[5px] text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: band.color }}>
                  {band.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Acertos e erros lado a lado, como na análise do atendimento */}
      <div className="mb-3.5 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <div
          className="dc-card overflow-hidden p-6"
          style={{
            borderTop: "1.5px solid rgba(87,201,138,.5)",
            background: "linear-gradient(180deg, rgba(20,34,42,.55), rgba(11,20,30,.5))",
          }}
        >
          <div className="mb-3.5 flex items-center gap-2">
            <span
              className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[12px] font-bold text-success"
              style={{ background: "rgba(87,201,138,.12)", border: "1px solid rgba(87,201,138,.34)" }}
              aria-hidden
            >
              ✓
            </span>
            <span className="mono-label text-success">O que funcionou</span>
          </div>
          <Lista itens={analise.acertos} />
        </div>

        <div
          className="dc-card overflow-hidden p-6"
          style={{
            borderTop: "1.5px solid rgba(244,114,106,.5)",
            background: "linear-gradient(180deg, rgba(38,24,30,.55), rgba(20,12,17,.5))",
          }}
        >
          <div className="mb-3.5 flex items-center gap-2">
            <span
              className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[12px] font-bold text-danger"
              style={{ background: "rgba(244,114,106,.12)", border: "1px solid rgba(244,114,106,.34)" }}
              aria-hidden
            >
              !
            </span>
            <span className="mono-label text-danger">O que atrapalhou o fechamento</span>
          </div>
          <Lista itens={analise.erros} />
        </div>
      </div>

      {/* Oportunidades perdidas: o que o cliente entregou e passou batido */}
      <div
        className="dc-card mb-3.5 overflow-hidden p-6"
        style={{
          borderTop: "1.5px solid rgba(245,193,99,.5)",
          background: "linear-gradient(180deg, rgba(38,33,20,.55), rgba(20,17,11,.5))",
        }}
      >
        <div className="mb-3.5 flex items-center gap-2">
          <span
            className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[12px] font-bold"
            style={{ color: "#f5c163", background: "rgba(245,193,99,.12)", border: "1px solid rgba(245,193,99,.34)" }}
            aria-hidden
          >
            ?
          </span>
          <span className="mono-label" style={{ color: "#f5c163" }}>
            Oportunidades que passaram
          </span>
        </div>
        <Lista itens={analise.perdidas} />
      </div>

      {/* Próxima ação — equivalente à "próxima missão" do atendimento */}
      <div
        className="dc-card mb-3.5 overflow-hidden p-6"
        style={{
          borderTop: "1.5px solid rgba(90,124,255,.6)",
          background: "linear-gradient(180deg, rgba(23,32,66,.6), rgba(12,17,38,.5))",
        }}
      >
        <div className="mb-3.5 flex items-center gap-2">
          <span
            className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[12px] font-bold text-cyan"
            style={{ background: "rgba(90,124,255,.14)", border: "1px solid rgba(90,124,255,.4)" }}
            aria-hidden
          >
            →
          </span>
          <span className="mono-label text-cyan">Na próxima reunião</span>
        </div>
        {foco && (
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Foco: {foco.label}</p>
        )}
        <p className="text-[14.5px] font-medium leading-[1.7] text-foreground">{analise.proximaAcao}</p>
      </div>

      {analise.contexto && (
        <div className="dc-card mb-3.5 p-6">
          <div className="mono-label mb-2.5">Contexto informado</div>
          <p className="text-[13px] leading-[1.6] text-muted">{analise.contexto}</p>
        </div>
      )}

      <div className="dc-card p-6">
        <button onClick={() => setVerTranscricao((v) => !v)} className="flex w-full items-center justify-between text-left">
          <span className="mono-label">Transcrição da reunião</span>
          <span className="text-[12px] text-muted">{verTranscricao ? "ocultar" : "mostrar"}</span>
        </button>
        {verTranscricao && (
          <pre className="mt-4 max-h-[420px] overflow-auto whitespace-pre-wrap rounded-xl bg-card-alt p-4 font-mono text-[12px] leading-[1.7] text-muted">
            {analise.transcricao}
          </pre>
        )}
      </div>
    </main>
  );
}
