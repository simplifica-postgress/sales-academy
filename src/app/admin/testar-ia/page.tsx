"use client";

import { useState, type FormEvent } from "react";
import { ref, uploadBytesResumable } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { adminPost } from "@/lib/adminApi";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import ScoreRing from "@/components/ScoreRing";
import Spinner from "@/components/Spinner";
import {
  ACCEPTED_AUDIO_TYPES,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  CRITERIA,
  MAX_IMAGES_PER_SUBMISSION,
  MAX_UPLOAD_BYTES,
} from "@/lib/constants";
import { criteriaFill, scoreBand } from "@/lib/ui";
import type { AIAnalysisResult } from "@/lib/analysis";

interface TestResponse {
  result: AIAnalysisResult;
  generalScore: number;
  mock: boolean;
  knowledgeChars: number;
  transcript?: string;
}

const ACCEPT = [...ACCEPTED_AUDIO_TYPES, ...ACCEPTED_VIDEO_TYPES].join(",");

const EXAMPLE = `Vendedor: Bom dia, Marcos! Aqui é o Rafael, da Simplifica. Vi que você pediu uma proposta pelo site ontem.
Lead: Oi, tudo bem. Isso, a gente tá olhando opções.
Vendedor: Legal. Hoje vocês usam alguma solução? E o que te fez buscar uma alternativa agora?
Lead: A gente perde muita venda no fim do mês, o time não segue processo.
Vendedor: Entendi. Nosso plano fica em R$ 1.890 por mês, com acompanhamento semanal.
Lead: Hum, achei um pouco alto. Vou pensar e te retorno.
Vendedor: Claro, sem problema! Qualquer coisa me chama.`;

function safeName(name: string): string {
  return name.replace(/[^\w.-]/g, "_").slice(-80);
}

function TestLab() {
  const { user, profile } = useAuth();
  const isMaster = profile?.role === "master";

  const [modo, setModo] = useState<"texto" | "arquivo" | "prints">("texto");
  const [prints, setPrints] = useState<File[]>([]);
  const [transcript, setTranscript] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [sellerName, setSellerName] = useState("");
  const [mainDifficulty, setMainDifficulty] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<TestResponse | null>(null);

  function onPickPrints(lista: FileList | null) {
    setError("");
    if (!lista?.length) return;
    const novos = Array.from(lista);
    if (novos.some((f) => !ACCEPTED_IMAGE_TYPES.includes(f.type))) {
      return setError("Envie PNG, JPG ou WEBP.");
    }
    const total = [...prints, ...novos];
    if (total.length > MAX_IMAGES_PER_SUBMISSION) {
      return setError(`No máximo ${MAX_IMAGES_PER_SUBMISSION} prints.`);
    }
    setPrints(total);
  }

  function onPickFile(f: File | null) {
    setError("");
    if (!f) return setFile(null);
    const ok = ACCEPTED_AUDIO_TYPES.includes(f.type) || ACCEPTED_VIDEO_TYPES.includes(f.type);
    if (!ok) return setError("Formato não suportado. Envie um áudio ou vídeo.");
    if (f.size > MAX_UPLOAD_BYTES) return setError("Arquivo muito grande (máximo 500 MB).");
    setFile(f);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setData(null);

    if (modo === "arquivo" && !file) return setError("Selecione um áudio ou vídeo.");
    if (modo === "prints" && prints.length === 0) return setError("Selecione ao menos um print.");
    if (modo === "texto" && transcript.trim().length < 20) {
      return setError("Cole uma transcrição com pelo menos 20 caracteres.");
    }
    if (modo !== "texto" && !user) return setError("Sessão expirada. Entre novamente.");

    setLoading(true);
    try {
      let filePath: string | undefined;
      let imagePaths: string[] | undefined;

      if (modo === "prints" && user) {
        // Mesma pasta do usuário (regras do Storage); o backend descarta depois.
        setUploadPct(0);
        imagePaths = [];
        for (let i = 0; i < prints.length; i++) {
          const p = `uploads/${user.uid}/teste-${Date.now()}-${i}-${safeName(prints[i].name)}`;
          const t = uploadBytesResumable(ref(storage, p), prints[i], { contentType: prints[i].type });
          await new Promise<void>((resolve, reject) => {
            t.on(
              "state_changed",
              (s) => setUploadPct(Math.round(((i + s.bytesTransferred / s.totalBytes) / prints.length) * 100)),
              () => reject(new Error("Falha ao enviar os prints.")),
              () => resolve()
            );
          });
          imagePaths.push(p);
        }
        setUploadPct(null);
      }

      if (modo === "arquivo" && file && user) {
        // Mesmo caminho do vendedor: as regras do Storage só deixam cada um
        // escrever na própria pasta. O backend apaga o arquivo depois.
        setUploadPct(0);
        filePath = `uploads/${user.uid}/teste-${Date.now()}-${safeName(file.name)}`;
        const task = uploadBytesResumable(ref(storage, filePath), file, {
          contentType: file.type,
        });
        await new Promise<void>((resolve, reject) => {
          task.on(
            "state_changed",
            (s) => setUploadPct(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
            () => reject(new Error("Falha ao enviar o arquivo.")),
            () => resolve()
          );
        });
        setUploadPct(null);
      }

      const res = await adminPost<TestResponse>("/api/admin/test-analysis", {
        transcript: modo === "texto" ? transcript : "",
        filePath,
        imagePaths,
        sellerName,
        mainDifficulty,
      });
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao testar.");
    } finally {
      setLoading(false);
      setUploadPct(null);
    }
  }

  const abaAtiva = "rounded-full px-4 py-2 text-[13px] font-semibold transition";

  return (
    <div className="fade-up">
      <div className="mb-6">
        <div className="mono-label" style={{ letterSpacing: "0.18em" }}>Laboratório</div>
        <h1 className="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.015em] text-foreground">Testar a IA</h1>
        <p className="mt-1.5 max-w-[680px] text-[13px] leading-[1.6] text-muted">
          {isMaster
            ? "Envie um áudio/vídeo ou cole uma transcrição e veja a análise na hora. Serve para conferir se a IA está avaliando do jeito certo depois que você mexer nos Princípios e Casos."
            : "Envie um áudio/vídeo ou cole uma transcrição e veja como a IA avalia o atendimento."}{" "}
          <strong className="text-foreground">Nada é salvo</strong> — não conta como treino de nenhum vendedor.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="dc-card mb-3.5 p-6">
        {/* Escolha do modo */}
        <div className="mb-4 flex flex-wrap gap-2">
          {(["texto", "arquivo", "prints"] as const).map((m) => {
            const on = modo === m;
            return (
              <button
                key={m}
                type="button"
                onClick={() => { setModo(m); setError(""); }}
                className={abaAtiva}
                style={{
                  border: `1px solid ${on ? "rgba(90,124,255,.5)" : "rgba(120,150,210,.16)"}`,
                  background: on ? "rgba(90,124,255,.12)" : "transparent",
                  color: on ? "#7f9bff" : "#79839c",
                }}
              >
                {m === "texto" ? "Colar transcrição" : m === "arquivo" ? "Enviar áudio ou vídeo" : "Prints de conversa"}
              </button>
            );
          })}
        </div>

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

        {modo === "texto" ? (
          <>
            <div className="mb-1.5 mt-4 flex items-center justify-between">
              <label htmlFor="tr" className="mono-label">Transcrição do atendimento</label>
              <button type="button" onClick={() => setTranscript(EXAMPLE)} className="text-[12px] font-semibold text-cyan hover:text-cyan-light">
                usar exemplo
              </button>
            </div>
            <textarea id="tr" value={transcript} onChange={(e) => setTranscript(e.target.value)} rows={10} className="field" style={{ resize: "vertical" }} placeholder="Cole aqui o diálogo do atendimento…" />
          </>
        ) : modo === "prints" ? (
          <>
            <div className="mb-1.5 mt-4"><span className="mono-label">Prints da conversa</span></div>
            <label htmlFor="tp" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl px-5 py-7 text-center transition" style={{ border: `1.5px dashed ${prints.length ? "rgba(90,124,255,.5)" : "rgba(120,150,210,.28)"}`, background: prints.length ? "rgba(90,124,255,.06)" : "rgba(11,17,36,.4)" }}>
              <span className="text-[13.5px] font-semibold text-foreground">
                {prints.length ? `${prints.length} print(s) selecionado(s)` : "Escolher prints da conversa"}
              </span>
              <span className="text-[11.5px] text-muted">PNG, JPG ou WEBP · até {MAX_IMAGES_PER_SUBMISSION}</span>
            </label>
            <input id="tp" type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple className="hidden" onChange={(e) => { onPickPrints(e.target.files); e.target.value = ""; }} />
            {prints.length > 0 && (
              <div className="mt-2.5 flex flex-col gap-1.5">
                {prints.map((p, i) => (
                  <div key={`${p.name}-${i}`} className="flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ background: "rgba(11,17,36,.55)", border: "1px solid rgba(120,150,210,.14)" }}>
                    <span className="flex h-[20px] w-[20px] flex-none items-center justify-center rounded-md font-mono text-[11px] font-bold text-cyan" style={{ background: "rgba(90,124,255,.14)" }}>{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">{p.name}</span>
                    <button type="button" onClick={() => setPrints(prints.filter((_, j) => j !== i))} className="flex-none text-[15px] leading-none text-muted transition hover:text-danger">×</button>
                  </div>
                ))}
              </div>
            )}
            <p className="mt-2 text-[12px] text-muted">A ordem acima é a ordem da conversa. Os prints são descartados após a leitura.</p>
          </>
        ) : (
          <>
            <div className="mb-1.5 mt-4"><span className="mono-label">Arquivo do atendimento</span></div>
            <label htmlFor="tf" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl px-5 py-8 text-center transition" style={{ border: `1.5px dashed ${file ? "rgba(90,124,255,.5)" : "rgba(120,150,210,.28)"}`, background: file ? "rgba(90,124,255,.05)" : "rgba(11,17,36,.4)" }}>
              <span className="text-[13.5px] font-semibold text-foreground">{file ? file.name : "Clique para escolher um áudio ou vídeo"}</span>
              <span className="text-[11.5px] text-muted">{file ? `${(file.size / 1048576).toFixed(1)} MB` : "MP3, M4A, WAV, MP4, MOV · até 500 MB"}</span>
            </label>
            <input id="tf" type="file" accept={ACCEPT} className="hidden" onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />
            <p className="mt-2 text-[12px] text-muted">A IA transcreve o áudio e analisa. O arquivo é descartado logo depois — nada fica guardado.</p>
          </>
        )}

        {error && <p className="mt-3.5 rounded-[10px] border border-[rgba(244,114,106,.28)] bg-[rgba(244,114,106,.08)] px-3.5 py-[11px] text-[13px] text-danger">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary mt-4 rounded-[10px] px-5 py-[12px] text-[13.5px] font-semibold disabled:opacity-50">
          {loading
            ? uploadPct !== null
              ? `Enviando… ${uploadPct}%`
              : "Analisando…"
            : "Analisar com a IA"}
        </button>
      </form>

      {loading && (
        <div className="dc-card flex flex-col items-center gap-3 py-12">
          <Spinner />
          <p className="text-[13px] text-muted">
            {uploadPct !== null ? "Enviando o arquivo…" : modo === "arquivo" ? "Transcrevendo e analisando… isso pode levar alguns minutos." : "A IA está lendo o atendimento…"}
          </p>
        </div>
      )}

      {data && (
        <div className="flex flex-col gap-3.5">
          {data.mock && (
            <p className="rounded-[10px] border border-[rgba(90,124,255,.35)] bg-[rgba(90,124,255,.08)] px-3.5 py-[11px] text-[13px] text-primary">
              ⚠️ <strong>Modo simulado ativo</strong> (AI_MOCK=true): este resultado é um exemplo fixo, não veio da OpenAI.
            </p>
          )}

          <div className="dc-card flex flex-wrap items-center gap-7 p-[26px]">
            <div className="mx-auto flex-none">
              <ScoreRing value={data.generalScore} size={130} strokeWidth={10} sublabel="de 100" />
            </div>
            <div className="min-w-[260px] flex-1">
              <div className="mono-label">Resumo</div>
              <p className="mt-2.5 text-[14px] leading-[1.65] text-foreground">{data.result.summary}</p>
              {/* Detalhe interno: só a Simplifica precisa saber disso. */}
              {isMaster && (
                <p className="mt-3 font-mono text-[11px] text-muted">
                  Princípios e Casos usados: {(data.knowledgeChars / 1000).toFixed(1)} mil caracteres
                </p>
              )}
            </div>
          </div>

          {/* Nota por critério — mesmas cores e ícones da tela de análise. */}
          <div className="dc-card p-6">
            <div className="mono-label mb-[18px]">Nota por critério</div>
            <div className="grid gap-x-11 gap-y-[26px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))" }}>
              {CRITERIA.map((c) => {
                const score = data.result.criteriaScores[c.key] ?? 0;
                const band = scoreBand(score);
                return (
                  <div key={c.key}>
                    <div className="mb-[7px] flex items-baseline justify-between gap-2.5">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="flex h-[17px] w-[17px] flex-none items-center justify-center rounded-full text-[10px] font-bold" style={{ color: band.color, background: band.bg, border: `1px solid ${band.border}` }} aria-hidden>
                          {band.icon}
                        </span>
                        <span className="text-[13px] leading-snug text-foreground">{c.label}</span>
                      </span>
                      <span className="flex flex-none items-baseline gap-1.5">
                        <span className="font-mono text-[10.5px] text-muted">peso {c.weight}</span>
                        <span className="font-mono text-[14px] font-semibold" style={{ color: band.color }}>{score}</span>
                      </span>
                    </div>
                    <div className="h-[5px] overflow-hidden rounded-full bg-indicator">
                      <div className="h-full rounded-full" style={{ width: `${score}%`, background: criteriaFill(score) }} />
                    </div>
                    <div className="mt-[5px] text-[10.5px] font-semibold uppercase tracking-[0.1em]" style={{ color: band.color }}>{band.label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Acertos e erros — verde/vermelho igual à tela de análise. */}
          <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
            <div className="dc-card overflow-hidden p-6" style={{ borderTop: "1.5px solid rgba(87,201,138,.5)", background: "linear-gradient(180deg, rgba(20,34,42,.55), rgba(11,20,30,.5))" }}>
              <div className="mb-3.5 flex items-center gap-2">
                <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[12px] font-bold text-success" style={{ background: "rgba(87,201,138,.12)", border: "1px solid rgba(87,201,138,.34)" }} aria-hidden>✓</span>
                <span className="mono-label text-success">O que fez bem</span>
                <span className="ml-auto rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold text-success" style={{ background: "rgba(87,201,138,.1)" }}>{data.result.strengths.length}</span>
              </div>
              <div className="flex flex-col gap-3">
                {data.result.strengths.map((s, i) => (
                  <div key={i} className="flex gap-[11px] text-[13.5px] leading-[1.55] text-foreground">
                    <span className="mt-px flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border border-[rgba(87,201,138,.34)] text-[10px] font-bold text-success" style={{ background: "rgba(87,201,138,.12)" }} aria-hidden>✓</span>
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="dc-card overflow-hidden p-6" style={{ borderTop: "1.5px solid rgba(244,114,106,.5)", background: "linear-gradient(180deg, rgba(38,24,30,.55), rgba(20,12,17,.5))" }}>
              <div className="mb-3.5 flex items-center gap-2">
                <span className="flex h-[22px] w-[22px] flex-none items-center justify-center rounded-full text-[12px] font-bold text-danger" style={{ background: "rgba(244,114,106,.12)", border: "1px solid rgba(244,114,106,.34)" }} aria-hidden>!</span>
                <span className="mono-label text-danger">O que deixou passar</span>
                <span className="ml-auto rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold text-danger" style={{ background: "rgba(244,114,106,.1)" }}>{data.result.mistakes.length}</span>
              </div>
              <div className="flex flex-col gap-3">
                {data.result.mistakes.map((m, i) => (
                  <div key={i} className="flex gap-[11px] text-[13.5px] leading-[1.55] text-foreground">
                    <span className="mt-px flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border border-[rgba(244,114,106,.34)] text-[10px] font-bold text-danger" style={{ background: "rgba(244,114,106,.12)" }} aria-hidden>!</span>
                    <span>{m}</span>
                  </div>
                ))}
              </div>
              {data.result.improvements.length > 0 && (
                <div className="mt-[18px] border-t border-[rgba(120,150,210,.11)] pt-4">
                  <div className="mb-3 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-primary">Onde pode melhorar</div>
                  <div className="flex flex-col gap-2.5">
                    {data.result.improvements.map((im, i) => (
                      <div key={i} className="flex gap-[11px] text-[13.5px] leading-[1.55] text-foreground">
                        <span className="mt-px font-semibold text-primary">→</span>
                        <span>{im}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl p-px" style={{ background: "linear-gradient(120deg, rgba(90,124,255,.55), rgba(127,155,255,.35), rgba(120,150,210,.12))" }}>
            <div className="rounded-[15px] p-6" style={{ background: "linear-gradient(100deg, #151f3c, #0b1124)" }}>
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                <span className="mono-label text-cyan">🎯 Próxima missão sugerida</span>
                {data.result.missionFocus && (
                  <span className="rounded-full px-2.5 py-[3px] text-[11px] font-semibold" style={{ color: "#f4726a", background: "rgba(244,114,106,.12)", border: "1px solid rgba(244,114,106,.3)" }}>
                    foco: {CRITERIA.find((c) => c.key === data.result.missionFocus)?.label}
                  </span>
                )}
              </div>
              <p className="text-[15px] font-medium leading-[1.6] text-foreground">{data.result.nextMission}</p>
            </div>
          </div>

          {/* Veio de áudio: mostra o que a IA de fato "ouviu". */}
          {data.transcript && (
            <details className="dc-card p-6">
              <summary className="cursor-pointer text-[13px] font-semibold text-cyan">Ver a transcrição gerada</summary>
              <p className="mt-3 whitespace-pre-wrap font-mono text-[12.5px] leading-[1.7] text-muted">{data.transcript}</p>
            </details>
          )}
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
