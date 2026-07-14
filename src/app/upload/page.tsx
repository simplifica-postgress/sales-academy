"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import AuthGate from "@/components/AuthGate";
import AppHeader from "@/components/AppHeader";
import Card from "@/components/Card";
import Spinner from "@/components/Spinner";
import {
  ACCEPTED_AUDIO_TYPES,
  ACCEPTED_VIDEO_TYPES,
  ATTENDANCE_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/lib/constants";

const ACCEPT = [...ACCEPTED_AUDIO_TYPES, ...ACCEPTED_VIDEO_TYPES].join(",");

const inputClass =
  "w-full rounded-lg border border-card-border bg-card-alt px-3 py-2.5 text-sm text-foreground placeholder-muted/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";

const PROCESSING_STEPS = [
  "Enviando seu atendimento…",
  "Transcrevendo a conversa…",
  "Analisando sua performance comercial…",
  "Montando seu plano de melhoria…",
];

function humanSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function UploadForm() {
  const { profile } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [attendanceType, setAttendanceType] = useState("");
  const [observation, setObservation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const suggestedTypes = profile?.attendanceTypes ?? [];
  const typeOptions = ATTENDANCE_TYPES.filter(
    (t) => suggestedTypes.length === 0 || suggestedTypes.includes(t.value)
  );

  function onPickFile(f: File | null) {
    setError("");
    if (!f) return setFile(null);
    const ok =
      ACCEPTED_AUDIO_TYPES.includes(f.type) ||
      ACCEPTED_VIDEO_TYPES.includes(f.type);
    if (!ok) {
      setError("Formato não suportado. Envie um áudio ou vídeo.");
      return;
    }
    if (f.size > MAX_UPLOAD_BYTES) {
      setError("Arquivo muito grande (máximo 500 MB).");
      return;
    }
    setFile(f);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file) return setError("Selecione um arquivo de áudio ou vídeo.");
    if (!attendanceType) return setError("Selecione o tipo de atendimento.");

    setError("");
    setSubmitting(true);
    setStepIndex(0);
    // Avança as mensagens de status enquanto processa (feedback ao usuário).
    const ticker = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, PROCESSING_STEPS.length - 1));
    }, 6000);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Sessão expirada. Entre novamente.");

      const body = new FormData();
      body.append("file", file);
      body.append("attendanceType", attendanceType);
      body.append("observation", observation);

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha ao processar.");

      router.replace(`/analise/${data.analysisId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado.");
      setSubmitting(false);
    } finally {
      clearInterval(ticker);
    }
  }

  if (submitting) {
    return (
      <Card>
        <div className="flex flex-col items-center gap-4 py-8 text-center">
          <Spinner />
          <div>
            <p className="text-base font-semibold text-white">
              {PROCESSING_STEPS[stepIndex]}
            </p>
            <p className="mt-2 text-sm text-muted">
              Isso pode levar alguns minutos, dependendo do tamanho da gravação.
              Não feche esta página.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card title="Arquivo do atendimento">
        <label
          htmlFor="file"
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-card-border bg-card-alt px-4 py-8 text-center transition hover:border-primary/60"
        >
          <span className="text-3xl">{file ? "🎧" : "⬆️"}</span>
          {file ? (
            <>
              <span className="text-sm font-medium text-foreground">
                {file.name}
              </span>
              <span className="text-xs text-muted">
                {humanSize(file.size)} · clique para trocar
              </span>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-foreground">
                Clique para escolher um áudio ou vídeo
              </span>
              <span className="text-xs text-muted">
                MP3, M4A, WAV, MP4, MOV · até 500 MB
              </span>
            </>
          )}
          <input
            id="file"
            ref={fileInputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
          />
        </label>
      </Card>

      <Card title="Sobre o atendimento">
        <div className="space-y-4">
          <div>
            <label htmlFor="type" className="label-dash mb-1.5 block">
              Tipo de atendimento
            </label>
            <select
              id="type"
              value={attendanceType}
              onChange={(e) => setAttendanceType(e.target.value)}
              className={inputClass}
            >
              <option value="" disabled>
                Selecione…
              </option>
              {typeOptions.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="obs" className="label-dash mb-1.5 block">
              Observação (opcional)
            </label>
            <textarea
              id="obs"
              rows={3}
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              className={inputClass}
              placeholder="Ex.: lead pediu desconto no final; era um follow-up de proposta…"
            />
          </div>
        </div>
      </Card>

      {error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          className="flex-1 rounded-lg bg-gradient-to-r from-blue-dark to-primary px-4 py-3 text-sm font-semibold text-white transition hover:from-primary hover:to-cyan"
        >
          Enviar para análise
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-card-border bg-card-alt px-4 py-3 text-sm font-medium text-muted transition hover:text-foreground"
        >
          Cancelar
        </Link>
      </div>
    </form>
  );
}

export default function UploadPage() {
  return (
    <AuthGate>
      <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8">
        <div className="mx-auto w-full max-w-2xl">
          <AppHeader />
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white">
              Enviar atendimento
            </h1>
            <p className="mt-1 text-sm text-muted">
              Envie um áudio ou vídeo de um atendimento real. A IA transcreve,
              analisa e devolve seu plano de melhoria.
            </p>
          </div>
          <UploadForm />
        </div>
      </main>
    </AuthGate>
  );
}
