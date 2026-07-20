"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ref, uploadBytesResumable } from "firebase/storage";
import { auth, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useSellerData } from "@/hooks/useSellerData";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import { ACCEPTED_AUDIO_TYPES, ACCEPTED_VIDEO_TYPES, ATTENDANCE_TYPES, CONSENT_TEXT, MAX_UPLOAD_BYTES } from "@/lib/constants";
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

  const [file, setFile] = useState<File | null>(null);
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
    if (!file) return setError("Selecione um arquivo de áudio ou vídeo.");
    if (!attendanceType) return setError("Selecione o tipo de atendimento.");
    if (!consent) return setError("É preciso aceitar o termo para enviar o atendimento.");
    if (!user) return setError("Sessão expirada. Entre novamente.");

    setError("");
    setSubmitting(true);
    setStepIndex(0);
    setUploadPct(0);
    let ticker: ReturnType<typeof setInterval> | undefined;

    try {
      // 1. Envia direto para o Storage (sem passar pelo servidor do app).
      const path = `uploads/${user.uid}/${Date.now()}-${safeName(file.name)}`;
      const task = uploadBytesResumable(ref(storage, path), file, {
        contentType: file.type,
      });

      await new Promise<void>((resolve, reject) => {
        task.on(
          "state_changed",
          (snap) =>
            setUploadPct(
              Math.round((snap.bytesTransferred / snap.totalBytes) * 100)
            ),
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

      // 2. Pede a análise: o backend baixa o arquivo do Storage.
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
        body: JSON.stringify({
          filePath: path,
          attendanceType,
          observation,
          consent: true,
        }),
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
          <div className="mx-auto h-[52px] w-[52px] rounded-full border-[3px] border-indicator" style={{ borderTopColor: "#00cbff", animation: "spin .9s linear infinite" }} />
          <div className="mt-[22px] text-base font-semibold text-foreground">
            {uploadPct !== null ? `Enviando seu atendimento… ${uploadPct}%` : `${PROCESSING_STEPS[stepIndex]}…`}
          </div>

          {uploadPct !== null && (
            <div className="mx-auto mt-4 h-2 max-w-[330px] overflow-hidden rounded-full bg-indicator">
              <div className="h-full rounded-full transition-all" style={{ width: `${uploadPct}%`, background: "linear-gradient(90deg,#0052b9,#0087f8,#00cbff)" }} />
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
                    color: done ? "#00cbff" : current ? "#0087f8" : "#9db2c3",
                    background: done ? "rgba(0,203,255,.1)" : current ? "rgba(0,135,248,.12)" : "#152946",
                    border: `1px solid ${done ? "rgba(0,203,255,.35)" : current ? "rgba(0,135,248,.5)" : "rgba(0,45,115,.5)"}`,
                  }}>{done ? "✓" : i + 1}</span>
                  <span className="text-[13px] font-medium" style={{ color: done ? "#9db2c3" : current ? "#ffffff" : "rgba(157,178,195,.6)" }}>{label}{current ? "…" : ""}</span>
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
        <p className="mt-2 text-[13.5px] leading-[1.6] text-muted">Áudio ou vídeo de um atendimento real. A IA transcreve, analisa e devolve seu plano de melhoria em minutos.</p>
      </div>

      {/* Já tem nota hoje: avisa antes de enviar, para o vendedor não achar
          que a barra travou quando o segundo envio não mexer nela. */}
      {analyzedToday && (
        <div className="mb-3.5 flex gap-3 rounded-2xl border border-[rgba(0,135,248,.35)] px-[18px] py-3.5" style={{ background: "rgba(0,135,248,.06)" }}>
          <span className="mt-px flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border border-[rgba(0,203,255,.4)] text-[11px] font-bold text-cyan" aria-hidden>i</span>
          <p className="text-[12.5px] leading-[1.6] text-muted">
            <strong className="text-foreground">Você já tem a nota de hoje.</strong> Pode enviar mais atendimentos e a IA analisa todos com o mesmo cuidado — mas a nota que entra na sua média e na barra é a do <strong className="text-foreground">primeiro do dia</strong>. Assim a evolução é medida ao longo dos dias, não pelo volume de envios.
          </p>
        </div>
      )}

      <label htmlFor="up-file" className="mb-3.5 flex cursor-pointer flex-col items-center justify-center gap-2.5 rounded-2xl px-5 py-[38px] text-center transition hover:border-[rgba(0,135,248,.65)]" style={{ border: `1.5px dashed ${file ? "rgba(0,135,248,.5)" : "rgba(0,45,115,.7)"}`, background: file ? "rgba(0,135,248,.05)" : "rgba(2,13,35,.5)" }}>
        <span className="flex h-[46px] w-[46px] items-center justify-center rounded-[13px] border border-[rgba(0,135,248,.35)] text-cyan" style={{ background: "rgba(0,135,248,.1)" }}>
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

      <div className="dc-card mb-3.5 p-6">
        <div className="mono-label mb-3">Tipo de atendimento</div>
        <div className="flex flex-wrap gap-2">
          {typeOptions.map((t) => {
            const active = attendanceType === t.value;
            return (
              <button key={t.value} type="button" onClick={() => setAttendanceType(t.value)} className="rounded-full px-4 py-2 text-[13px] font-medium transition" style={{
                border: `1px solid ${active ? "rgba(0,135,248,.55)" : "rgba(0,45,115,.55)"}`,
                background: active ? "rgba(0,135,248,.14)" : "#020d23",
                color: active ? "#00cbff" : "#9db2c3",
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

        <div className="mb-4 flex gap-3 rounded-xl border border-[rgba(0,45,115,.6)] bg-card-alt p-4">
          <span className="mt-0.5 flex h-[22px] w-[22px] flex-none items-center justify-center rounded-md border border-[rgba(0,135,248,.35)] text-cyan" style={{ background: "rgba(0,135,248,.1)" }}>
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
            className="mt-0.5 h-[18px] w-[18px] flex-none cursor-pointer accent-[#0087f8]"
          />
          <span className="text-[12.5px] leading-[1.6] text-muted">{CONSENT_TEXT}</span>
        </label>
      </div>

      {error && <p className="mb-3.5 rounded-[10px] border border-[rgba(255,90,80,.28)] bg-[rgba(255,90,80,.08)] px-3.5 py-[11px] text-[13px] text-danger">{error}</p>}

      <div className="flex gap-2.5">
        <button type="submit" disabled={!consent} className="btn-primary flex-1 rounded-[11px] px-5 py-[13px] text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50">Enviar para análise</button>
        <button type="button" onClick={() => router.push("/dashboard")} className="rounded-[11px] border border-[rgba(0,45,115,.6)] bg-card-alt px-5 py-[13px] text-sm font-medium text-muted transition hover:text-foreground">Cancelar</button>
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
