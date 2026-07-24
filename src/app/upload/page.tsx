"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytesResumable } from "firebase/storage";
import { auth, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useSellerData } from "@/hooks/useSellerData";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import {
  ACCEPTED_AUDIO_TYPES,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
  ATTENDANCE_TYPES,
  CONSENT_TEXT,
  MAX_IMAGES_PER_SUBMISSION,
  MAX_IMAGE_BYTES,
  MAX_UPLOAD_BYTES,
} from "@/lib/constants";
import { isToday } from "@/lib/training";

const ACCEPT = [...ACCEPTED_AUDIO_TYPES, ...ACCEPTED_VIDEO_TYPES].join(",");
const PROCESSING_STEPS = ["Enviando seu atendimento", "Transcrevendo a conversa", "Analisando sua performance comercial", "Montando seu plano de melhoria"];

/** Nome de arquivo seguro para o Storage. */
function safeName(name: string): string {
  return name.replace(/[^\w.-]/g, "_").slice(-80);
}

function humanSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadForm() {
  const { user, profile } = useAuth();
  const router = useRouter();
  // Pelas ANÁLISES, não pelos uploads: se o primeiro envio do dia falhou,
  // ainda não existe nota de hoje e o próximo é que vai valer.
  const { analyses } = useSellerData(user?.uid);
  const analyzedToday = analyses.some((a) => isToday(a.createdAt));

  const [modo, setModo] = useState<"arquivo" | "prints" | "texto">("arquivo");
  const [file, setFile] = useState<File | null>(null);
  const [prints, setPrints] = useState<File[]>([]);
  const [texto, setTexto] = useState("");
  const [attendanceType, setAttendanceType] = useState("");
  const [observation, setObservation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  // Progresso real do envio ao Storage (0–100); null enquanto não envia.
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [consent, setConsent] = useState(false);

  const suggested = profile?.attendanceTypes ?? [];
  const typeOptions = ATTENDANCE_TYPES.filter((t) => suggested.length === 0 || suggested.includes(t.value));

  function onPickPrints(lista: FileList | null) {
    setError("");
    if (!lista || lista.length === 0) return;
    const novos = Array.from(lista);
    for (const f of novos) {
      if (!ACCEPTED_IMAGE_TYPES.includes(f.type)) {
        return setError("Envie prints em PNG, JPG ou WEBP.");
      }
      if (f.size > MAX_IMAGE_BYTES) {
        return setError(`"${f.name}" é grande demais (máximo 8 MB por print).`);
      }
    }
    const total = [...prints, ...novos];
    if (total.length > MAX_IMAGES_PER_SUBMISSION) {
      return setError(`No máximo ${MAX_IMAGES_PER_SUBMISSION} prints por envio.`);
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

  /** Sobe um arquivo para a pasta do próprio vendedor e devolve o caminho. */
  async function enviarArquivo(f: File, uid: string, aoProgredir: (p: number) => void) {
    const path = `uploads/${uid}/${Date.now()}-${safeName(f.name)}`;
    const task = uploadBytesResumable(ref(storage, path), f, { contentType: f.type });
    await new Promise<void>((resolve, reject) => {
      task.on(
        "state_changed",
        (snap) => aoProgredir(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        (err) =>
          reject(
            new Error(
              err.code === "storage/unauthorized"
                ? "Sem permissão para enviar. Verifique as regras do Storage."
                : "Falha ao enviar o arquivo. Tente novamente."
            )
          ),
        () => resolve()
      );
    });
    return path;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (modo === "arquivo" && !file) return setError("Selecione um arquivo de áudio ou vídeo.");
    if (modo === "prints" && prints.length === 0) return setError("Selecione ao menos um print da conversa.");
    if (modo === "texto" && texto.trim().length < 20) {
      return setError("Cole a conversa (pelo menos 20 caracteres).");
    }
    if (!attendanceType) return setError("Selecione o tipo de atendimento.");
    if (!consent) return setError("É preciso aceitar o termo para enviar o atendimento.");
    if (!user) return setError("Sessão expirada. Entre novamente.");

    setError("");
    setSubmitting(true);
    setStepIndex(0);
    let ticker: ReturnType<typeof setInterval> | undefined;

    try {
      const corpo: Record<string, unknown> = { attendanceType, observation, consent: true };

      if (modo === "arquivo" && file) {
        setUploadPct(0);
        corpo.filePath = await enviarArquivo(file, user.uid, setUploadPct);
      } else if (modo === "prints") {
        // Sobe os prints NA ORDEM escolhida — é a sequência da conversa.
        setUploadPct(0);
        const caminhos: string[] = [];
        for (let i = 0; i < prints.length; i++) {
          caminhos.push(
            await enviarArquivo(prints[i], user.uid, (p) =>
              setUploadPct(Math.round(((i + p / 100) / prints.length) * 100))
            )
          );
        }
        corpo.imagePaths = caminhos;
      } else {
        corpo.pastedText = texto.trim();
      }

      setUploadPct(null);
      ticker = setInterval(
        () => setStepIndex((i) => Math.min(i + 1, PROCESSING_STEPS.length - 1)),
        6000
      );
      setStepIndex(1);

      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sessão expirada. Entre novamente.");

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(corpo),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao processar.");
      router.replace(`/analise/${data.analysisId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado.");
      setSubmitting(false);
      setUploadPct(null);
    } finally {
      if (ticker) clearInterval(ticker);
    }
  }

  if (submitting) {
    return (
      <div className="fade-up mx-auto max-w-[660px]">
        <div className="dc-card mt-10 px-8 py-11 text-center">
          <div className="mx-auto h-[52px] w-[52px] rounded-full border-[3px] border-indicator" style={{ borderTopColor: "#7f9bff", animation: "spin .9s linear infinite" }} />
          <div className="mt-[22px] text-base font-semibold text-foreground">
            {uploadPct !== null ? `Enviando seu atendimento… ${uploadPct}%` : `${PROCESSING_STEPS[stepIndex]}…`}
          </div>

          {uploadPct !== null && (
            <div className="mx-auto mt-4 h-2 max-w-[330px] overflow-hidden rounded-full bg-indicator">
              <div className="h-full rounded-full transition-all" style={{ width: `${uploadPct}%`, background: "linear-gradient(90deg,#4a6edc,#5a7cff,#7f9bff)" }} />
            </div>
          )}

          <p className="mt-3 text-[12.5px] leading-[1.6] text-muted">Isso pode levar alguns minutos, dependendo do tamanho da gravação.<br />Não feche esta página.</p>
          <div className="mx-auto mt-[26px] flex max-w-[330px] flex-col gap-[11px] text-left">
            {PROCESSING_STEPS.map((label, i) => {
              // Durante o envio, só o passo 0 está em andamento.
              const activeIndex = uploadPct !== null ? 0 : stepIndex;
              const done = i < activeIndex;
              const current = i === activeIndex;
              return (
                <div key={i} className="flex items-center gap-[11px]">
                  <span className="flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full text-[9.5px] font-semibold" style={{
                    color: done ? "#7f9bff" : current ? "#5a7cff" : "#79839c",
                    background: done ? "rgba(127,155,255,.1)" : current ? "rgba(90,124,255,.12)" : "#1b2440",
                    border: `1px solid ${done ? "rgba(127,155,255,.35)" : current ? "rgba(90,124,255,.5)" : "rgba(120,150,210,.14)"}`,
                  }}>{done ? "✓" : i + 1}</span>
                  <span className="text-[13px] font-medium" style={{ color: done ? "#79839c" : current ? "#ffffff" : "rgba(157,178,195,.6)" }}>{label}{current ? "…" : ""}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="fade-up mx-auto max-w-[660px]">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.015em] text-foreground">Enviar atendimento</h1>
        <p className="mt-2 text-[13.5px] leading-[1.6] text-muted">Ligação, reunião ou conversa por mensagem. A IA analisa e devolve seu plano de melhoria em minutos.</p>
      </div>

      {/* Já tem nota hoje: aviso curto, só para o vendedor não estranhar se a
          barra não mexer com o segundo envio. */}
      {analyzedToday && (
        <div className="mb-3.5 inline-flex items-center gap-2.5 rounded-full border border-[rgba(90,124,255,.35)] px-4 py-2" style={{ background: "rgba(90,124,255,.06)" }}>
          <span className="flex h-[17px] w-[17px] flex-none items-center justify-center rounded-full border border-[rgba(127,155,255,.4)] text-[10px] font-bold text-cyan" aria-hidden>i</span>
          <span className="text-[12.5px] font-medium text-foreground">Você já tem a nota de hoje.</span>
        </div>
      )}

      {/* Como o atendimento aconteceu: ligação (áudio), prints de conversa
          ou a conversa colada em texto. */}
      <div className="mb-3.5 grid grid-cols-3 gap-2">
        {([
          { id: "arquivo", label: "Áudio ou vídeo", sub: "ligação, reunião" },
          { id: "prints", label: "Prints", sub: "WhatsApp, chat" },
          { id: "texto", label: "Colar conversa", sub: "texto" },
        ] as const).map((m) => {
          const on = modo === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => { setModo(m.id); setError(""); }}
              className="rounded-xl px-2 py-2.5 text-center transition"
              style={{
                border: `1px solid ${on ? "rgba(90,124,255,.5)" : "rgba(120,150,210,.16)"}`,
                background: on ? "rgba(90,124,255,.1)" : "transparent",
              }}
            >
              <span className="block text-[12.5px] font-semibold" style={{ color: on ? "#7f9bff" : "#cdd5e6" }}>{m.label}</span>
              <span className="mt-0.5 block text-[10.5px] text-muted">{m.sub}</span>
            </button>
          );
        })}
      </div>

      {modo === "arquivo" && (
        <label htmlFor="up-file" className="mb-3.5 flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl px-5 py-[38px] text-center transition hover:border-[rgba(90,124,255,.65)]" style={{ border: `1.5px dashed ${file ? "rgba(90,124,255,.5)" : "rgba(120,150,210,.18)"}`, background: file ? "rgba(90,124,255,.05)" : "rgba(2,13,35,.5)" }}>
          <span className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] border border-[rgba(90,124,255,.35)] text-cyan" style={{ background: "rgba(90,124,255,.1)" }}>
            {file ? (
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M9 18V6l10-2v11" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="16.5" cy="15" r="2.5" /></svg>
            ) : (
              <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3v10" /><path d="M7.5 7.5 12 3l4.5 4.5" /><path d="M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" /></svg>
            )}
          </span>
          <div className="text-sm font-semibold text-foreground">{file ? file.name : "Clique para escolher um áudio ou vídeo"}</div>
          <div className="font-mono text-[11.5px] text-muted">{file ? `${humanSize(file.size)} · clique para trocar` : "MP3, M4A, WAV, MP4, MOV · até 500 MB"}</div>
          <input id="up-file" type="file" accept={ACCEPT} className="hidden" onChange={(e) => onPickFile(e.target.files?.[0] ?? null)} />
        </label>
      )}

      {modo === "prints" && (
        <div className="mb-3.5">
          <label htmlFor="up-prints" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl px-5 py-[30px] text-center transition" style={{ border: `1.5px dashed ${prints.length ? "rgba(90,124,255,.5)" : "rgba(120,150,210,.18)"}`, background: prints.length ? "rgba(90,124,255,.05)" : "rgba(2,13,35,.5)" }}>
            <span className="flex h-[44px] w-[44px] items-center justify-center rounded-[13px] border border-[rgba(90,124,255,.35)] text-cyan" style={{ background: "rgba(90,124,255,.1)" }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 15l4-4 4 4 3-3 4 4" /><circle cx="8.5" cy="9" r="1.2" /></svg>
            </span>
            <div className="text-sm font-semibold text-foreground">
              {prints.length ? `${prints.length} print(s) selecionado(s)` : "Clique para escolher os prints"}
            </div>
            <div className="text-[11.5px] text-muted">PNG, JPG ou WEBP · até {MAX_IMAGES_PER_SUBMISSION} prints</div>
            <input id="up-prints" type="file" accept={ACCEPTED_IMAGE_TYPES.join(",")} multiple className="hidden" onChange={(e) => { onPickPrints(e.target.files); e.target.value = ""; }} />
          </label>

          {prints.length > 0 && (
            <>
              <p className="mt-2.5 text-[12px] text-muted">
                A ordem abaixo é a ordem da conversa. Envie do começo para o fim.
              </p>
              <div className="mt-2 flex flex-col gap-1.5">
                {prints.map((p, i) => (
                  <div key={`${p.name}-${i}`} className="flex items-center gap-2.5 rounded-lg px-3 py-2" style={{ background: "rgba(11,17,36,.55)", border: "1px solid rgba(120,150,210,.14)" }}>
                    <span className="flex h-[20px] w-[20px] flex-none items-center justify-center rounded-md font-mono text-[11px] font-bold text-cyan" style={{ background: "rgba(90,124,255,.14)" }}>{i + 1}</span>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-foreground">{p.name}</span>
                    <span className="flex-none font-mono text-[11px] text-muted">{humanSize(p.size)}</span>
                    <button type="button" onClick={() => setPrints(prints.filter((_, j) => j !== i))} className="flex-none text-[15px] leading-none text-muted transition hover:text-danger" title="Remover">×</button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {modo === "texto" && (
        <div className="mb-3.5">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={10}
            className="field"
            style={{ resize: "vertical" }}
            placeholder={"Cole aqui a conversa. Ex.:\n\nVendedor: Oi Marcos, tudo bem? Vi que você pediu informação…\nCliente: Oi! Queria saber o valor.\nVendedor: …"}
          />
          <p className="mt-2 text-[12px] leading-[1.55] text-muted">
            Pode colar direto do WhatsApp (opção <strong className="text-foreground">Exportar conversa</strong>) ou digitar como foi.
          </p>
        </div>
      )}

      <div className="dc-card mb-3.5 p-6">
        <div className="mono-label mb-3">Tipo de atendimento</div>
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((t) => {
            const active = attendanceType === t.value;
            return (
              <button key={t.value} type="button" onClick={() => setAttendanceType(t.value)} className="rounded-full px-4 py-2 text-[13px] font-medium transition" style={{
                border: `1px solid ${active ? "rgba(90,124,255,.55)" : "rgba(120,150,210,.15)"}`,
                background: active ? "rgba(90,124,255,.14)" : "#070b16",
                color: active ? "#7f9bff" : "#79839c",
              }}>{t.label}</button>
            );
          })}
        </div>
        <div className="mono-label mb-2.5 mt-5">Observação <span className="lowercase" style={{ color: "rgba(157,178,195,.6)", letterSpacing: 0 }}>(opcional)</span></div>
        <textarea rows={3} value={observation} onChange={(e) => setObservation(e.target.value)} className="field" style={{ resize: "vertical" }} placeholder="Ex.: lead pediu desconto no final; era um follow-up de proposta…" />
      </div>

      {/* Consentimento + aviso de armazenamento (LGPD) */}
      <div className="dc-card mb-3.5 p-6">
        <div className="mono-label mb-3">Privacidade e consentimento</div>

        <div className="mb-4 flex gap-3 rounded-xl border border-[rgba(120,150,210,.16)] bg-card-alt p-4">
          <span className="mt-0.5 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md border border-[rgba(90,124,255,.35)] text-cyan" style={{ background: "rgba(90,124,255,.1)" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          </span>
          <div className="text-[12.5px] leading-[1.6] text-muted">
            <strong className="text-foreground">Este arquivo será armazenado.</strong> A gravação fica guardada em servidor seguro da Simplifica, é processada por IA para gerar sua análise e fica acessível ao seu gestor. Só você e a Simplifica têm acesso — nenhum outro vendedor consegue ver.
          </div>
        </div>

        <label htmlFor="consent" className="flex cursor-pointer gap-3">
          <input
            id="consent"
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-0.5 h-[18px] w-[18px] flex-none cursor-pointer accent-[#5a7cff]"
          />
          <span className="text-[12.5px] leading-[1.6] text-muted">{CONSENT_TEXT}</span>
        </label>
      </div>

      {error && <p className="mb-3.5 rounded-[10px] border border-[rgba(244,114,106,.28)] bg-[rgba(244,114,106,.08)] px-3.5 py-[11px] text-[13px] text-danger">{error}</p>}

      <div className="flex gap-2.5">
        <button type="submit" disabled={!consent} className="btn-primary flex-1 rounded-[11px] px-5 py-[13px] text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">Enviar para análise</button>
        <button type="button" onClick={() => router.push("/dashboard")} className="rounded-[11px] border border-[rgba(120,150,210,.16)] bg-card-alt px-5 py-[13px] text-sm font-medium text-muted transition hover:text-foreground">Cancelar</button>
      </div>
    </form>
  );
}

export default function UploadPage() {
  return (
    <AuthGate>
      <AppShell>
        <UploadForm />
      </AppShell>
    </AuthGate>
  );
}
