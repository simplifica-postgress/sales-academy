"use client";

import { useState, type FormEvent } from "react";
import { adminPost } from "@/lib/adminApi";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import ScoreRing from "@/components/ScoreRing";
import Spinner from "@/components/Spinner";
import { CRITERIA } from "@/lib/constants";
import { criteriaFill, scoreColor } from "@/lib/ui";
import type { AIAnalysisResult } from "@/lib/analysis";

interface TestResponse {
  result: AIAnalysisResult;
  generalScore: number;
  mock: boolean;
  knowledgeChars: number;
}

const EXAMPLE = `Vendedor: Bom dia, Marcos! Aqui é o Rafael, da Simplifica. Vi que você pediu uma proposta pelo site ontem.
Lead: Oi, tudo bem. Isso, a gente tá olhando opções.
Vendedor: Legal. Hoje vocês usam alguma solução? E o que te fez buscar uma alternativa agora?
Lead: A gente perde muita venda no fim do mês, o time não segue processo.
Vendedor: Entendi. Nosso plano fica em R$ 1.890 por mês, com acompanhamento semanal.
Lead: Hum, achei um pouco alto. Vou pensar e te retorno.
Vendedor: Claro, sem problema! Qualquer coisa me chama.`;

function TestLab() {
  const [transcript, setTranscript] = useState("");
  const [sellerName, setSellerName] = useState("");
  const [mainDifficulty, setMainDifficulty] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<TestResponse | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setData(null);
    setLoading(true);
    try {
      const res = await adminPost<TestResponse>("/api/admin/test-analysis", {
        transcript,
        sellerName,
        mainDifficulty,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao testar.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fade-up">
      <div className="mb-6">
        <div className="mono-label" style={{ letterSpacing: "0.18em" }}>Laboratório</div>
        <h1 className="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.015em] text-foreground">Testar a IA</h1>
        <p className="mt-1.5 max-w-[680px] text-[13px] leading-[1.6] text-muted">
          Cole a transcrição de um atendimento e veja a análise na hora. Serve para conferir se a IA está avaliando do jeito certo depois que você mexer na base de conhecimento. <strong className="text-foreground">Nada é salvo</strong> — não conta como treino de nenhum vendedor.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="dc-card mb-3.5 p-6">
        <div className="grid gap-3.5 sm:grid-cols-2">
          <div>
            <label htmlFor="sn" className="mono-label mb-1.5 block">Nome do vendedor (opcional)</label>
            <input id="sn" value={sellerName} onChange={(e) => setSellerName(e.target.value)} className="field" placeholder="Ex.: Rafael" />
          </div>
          <div>
            <label htmlFor="md" className="mono-label mb-1.5 block">Dificuldade principal (opcional)</label>
            <input id="md" value={mainDifficulty} onChange={(e) => setMainDifficulty(e.target.value)} className="field" placeholder="Ex.: leads somem depois do preço" />
          </div>
        </div>

        <div className="mb-1.5 mt-4 flex items-center justify-between">
          <label htmlFor="tr" className="mono-label">Transcrição do atendimento</label>
          <button type="button" onClick={() => setTranscript(EXAMPLE)} className="text-[12px] font-semibold text-cyan hover:text-cyan-light">
            usar exemplo
          </button>
        </div>
        <textarea id="tr" value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={10} className="field" style={{ resize: "vertical" }} placeholder="Cole aqui o diálogo do atendimento…" required />

        {error && <p className="mt-3.5 rounded-[10px] border border-[rgba(244,114,106,.28)] bg-[rgba(244,114,106,.08)] px-3.5 py-[11px] text-[13px] text-danger">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary mt-4 rounded-[10px] px-5 py-[12px] text-[13.5px] font-semibold disabled:opacity-50">
          {loading ? "Analisando…" : "Analisar com a IA"}
        </button>
      </form>

      {loading && (
        <div className="dc-card flex flex-col items-center gap-3 py-12">
          <Spinner />
          <p className="text-[13px] text-muted">A IA está lendo o atendimento…</p>
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-3.5">
          {data.mock && (
            <p className="rounded-[10px] border border-[rgba(90,124,255,.35)] bg-[rgba(90,124,255,.08)] px-3.5 py-[11px] text-[13px] text-primary">
              ⚠️ <strong>Modo simulado ativo</strong> (AI_MOCK=true): este resultado é um exemplo fixo, não veio da OpenAI. Para testar a IA de verdade, é preciso ter créditos na OpenAI e desligar o modo simulado.
            </p>
          )}

          <div className="dc-card flex flex-wrap items-center gap-7 p-[26px]">
            <div className="mx-auto flex-none">
              <ScoreRing value={data.generalScore} size={130} strokeWidth={10} sublabel="de 100" />
            </div>
            <div className="min-w-[260px] flex-1">
              <div className="mono-label">Resumo</div>
              <p className="mt-2.5 text-[14px] leading-[1.65] text-foreground">{data.result.summary}</p>
              <p className="mt-3 font-mono text-[11px] text-muted">
                Base de conhecimento usada: {(data.knowledgeChars / 1000).toFixed(1)} mil caracteres
              </p>
            </div>
          </div>

          <div className="dc-card p-6">
            <div className="mono-label mb-[18px]">Nota por critério</div>
            <div className="grid gap-x-7 gap-y-4" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              {CRITERIA.map((c) => {
                const score = data.result.criteriaScores[c.key] ?? 0;
                return (
                  <div key={c.key}>
                    <div className="mb-[7px] flex items-baseline justify-between gap-2.5">
                      <span className="text-[13px] text-foreground">{c.label}</span>
                      <span className="flex items-baseline gap-1.5">
                        <span className="font-mono text-[10.5px] text-muted">peso {c.weight}</span>
                        <span className="font-mono text-[14px] font-semibold" style={{ color: scoreColor(score) }}>{score}</span>
                      </span>
                    </div>
                    <div className="h-[5px] overflow-hidden rounded-full bg-indicator">
                      <div className="h-full rounded-full" style={{ width: `${score}%`, background: criteriaFill(score) }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            <div className="dc-card p-6">
              <div className="mono-label mb-3.5 text-cyan">O que fez bem</div>
              <ul className="flex flex-col gap-2.5">
                {data.result.strengths.map((s, i) => (
                  <li key={i} className="text-[13.5px] leading-[1.55] text-foreground">✓ {s}</li>
                ))}
              </ul>
            </div>
            <div className="dc-card p-6">
              <div className="mono-label mb-3.5 text-danger">O que deixou passar</div>
              <ul className="flex flex-col gap-2.5">
                {data.result.mistakes.map((m, i) => (
                  <li key={i} className="text-[13.5px] leading-[1.55] text-foreground">! {m}</li>
                ))}
              </ul>
              {data.result.improvements.length > 0 && (
                <div className="mt-4 border-t border-[rgba(120,150,210,.11)] pt-4">
                  <div className="mono-label mb-2.5 text-primary">Onde pode melhorar</div>
                  <ul className="flex flex-col gap-2">
                    {data.result.improvements.map((im, i) => (
                      <li key={i} className="text-[13.5px] leading-[1.55] text-foreground">→ {im}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl p-px" style={{ background: "linear-gradient(120deg, rgba(90,124,255,.55), rgba(127,155,255,.35), rgba(120,150,210,.12))" }}>
            <div className="rounded-[15px] p-6" style={{ background: "linear-gradient(100deg, #151f3c, #0b1124)" }}>
              <div className="mono-label mb-2.5 text-cyan">🎯 Próxima missão sugerida</div>
              <p className="text-[15px] font-medium leading-[1.6] text-foreground">{data.result.nextMission}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function TestLabPage() {
  return (
    <AuthGate allow={["manager", "master"]}>
      <AppShell>
        <TestLab />
      </AppShell>
    </AuthGate>
  );
}
