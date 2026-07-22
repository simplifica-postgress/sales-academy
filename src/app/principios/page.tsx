"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import Spinner from "@/components/Spinner";
import VideoCard, { type VideoRow } from "@/components/VideoCard";
import { SALES_KNOWLEDGE } from "@/lib/knowledge";
import { kindOf, numberPrinciples, type PrincipleEntry } from "@/lib/principles";
import type { VideoLesson } from "@/lib/types";

type Filtro = "todos" | "principio" | "caso";

const FILTROS: { key: Filtro; label: string }[] = [
  { key: "todos", label: "Tudo" },
  { key: "principio", label: "Princípios" },
  { key: "caso", label: "Casos" },
];

function Principles() {
  const [entries, setEntries] = useState<PrincipleEntry[] | null>(null);
  const [videos, setVideos] = useState<VideoRow[]>([]);
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<number | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "knowledge"),
      (snap) =>
        setEntries(
          snap.docs.map((d) => ({ id: d.id, ...(d.data() as PrincipleEntry) }))
        ),
      // Sem permissão ou coleção vazia: cai no material versionado no app.
      () => setEntries(SALES_KNOWLEDGE as PrincipleEntry[])
    );
    return unsub;
  }, []);

  // Vídeos ligados a cada princípio (o vínculo mora no próprio vídeo).
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "videos"),
      (snap) =>
        setVideos(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as VideoLesson) }))
            .filter((v) => v.enabled !== false)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        ),
      () => setVideos([])
    );
    return unsub;
  }, []);

  // Mesma numeração que a IA usa no prompt — é o que torna a citação útil.
  const numeradas = useMemo(
    () => numberPrinciples(entries ?? []),
    [entries]
  );

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return numeradas.filter((e) => {
      if (filtro !== "todos" && kindOf(e) !== filtro) return false;
      if (!termo) return true;
      return (
        e.title.toLowerCase().includes(termo) ||
        e.content.toLowerCase().includes(termo) ||
        String(e.number) === termo
      );
    });
  }, [numeradas, filtro, busca]);

  /** Vídeos vinculados a um princípio. */
  const videosDe = (principleId?: string) =>
    principleId ? videos.filter((v) => (v.principleIds ?? []).includes(principleId)) : [];

  if (entries === null) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Spinner /></div>;
  }

  return (
    <div className="fade-up">
      <div className="mb-[22px]">
        <div className="mono-label" style={{ letterSpacing: "0.18em" }}>Método Simplifica</div>
        <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.015em] text-foreground">Princípios e Casos</h1>
        <p className="mt-2 max-w-[680px] text-[13.5px] leading-[1.6] text-muted">
          É este material que a IA usa para avaliar seus atendimentos. Quando a análise citar <strong className="text-foreground">“Princípio 3”</strong>, é este número aqui — procure abaixo para entender o que faltou.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2.5">
        {FILTROS.map((f) => {
          const active = filtro === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className="rounded-full px-3.5 py-[7px] text-[12.5px] font-medium transition"
              style={{
                border: `1px solid ${active ? "rgba(90,124,255,.5)" : "rgba(120,150,210,.15)"}`,
                background: active ? "rgba(90,124,255,.12)" : "transparent",
                color: active ? "#7f9bff" : "#79839c",
              }}
            >
              {f.label}
            </button>
          );
        })}
        <input
          className="field ml-auto max-w-[260px]"
          placeholder="Buscar por palavra ou número…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </div>

      {visiveis.length === 0 ? (
        <div className="dc-card px-6 py-12 text-center">
          <p className="text-[13.5px] text-muted">
            {numeradas.length === 0
              ? "O material ainda não foi publicado pela Simplifica."
              : "Nada encontrado para essa busca."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visiveis.map((e) => {
            const caso = kindOf(e) === "caso";
            const open = aberto === e.number;
            return (
              <div key={e.number} className="dc-card overflow-hidden">
                <button
                  onClick={() => setAberto(open ? null : e.number)}
                  className="flex w-full items-start gap-3.5 px-[22px] py-[18px] text-left transition hover:bg-[rgba(90,124,255,.04)]"
                >
                  <span
                    className="mt-px flex h-[26px] w-[26px] flex-none items-center justify-center rounded-lg font-mono text-[12px] font-bold"
                    style={
                      caso
                        ? { color: "#57c98a", background: "rgba(87,201,138,.12)", border: "1px solid rgba(87,201,138,.3)" }
                        : { color: "#7f9bff", background: "rgba(90,124,255,.12)", border: "1px solid rgba(90,124,255,.3)" }
                    }
                  >
                    {e.number}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="text-[14.5px] font-semibold text-foreground">{e.title}</span>
                      {caso && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-success" style={{ background: "rgba(87,201,138,.1)" }}>
                          caso real
                        </span>
                      )}
                    </span>
                    {!open && (
                      <span className="mt-1.5 block truncate text-[12.5px] text-muted">{e.content}</span>
                    )}
                    {e.source && open && (
                      <span className="mt-1.5 block font-mono text-[11px] text-dim">{e.source}</span>
                    )}
                  </span>
                  {/* Sinaliza que há vídeo mesmo com o tópico fechado. */}
                  {!open && videosDe(e.id).length > 0 && (
                    <span className="mt-0.5 flex flex-none items-center gap-1 rounded-full px-2 py-0.5 text-[10.5px] font-semibold" style={{ color: "#7f9bff", background: "rgba(90,124,255,.12)" }}>
                      ▶ {videosDe(e.id).length}
                    </span>
                  )}
                  <span className="mt-0.5 flex-none text-[13px] text-muted">{open ? "−" : "+"}</span>
                </button>
                {open && (
                  <div className="border-t border-[rgba(120,150,210,.1)]">
                    <p className="px-[22px] py-[18px] text-[13.5px] leading-[1.7]" style={{ color: "var(--body)" }}>
                      {e.content}
                    </p>
                    {/* Vídeos deste princípio: a teoria acima, o exemplo aqui. */}
                    {videosDe(e.id).length > 0 && (
                      <div className="border-t border-[rgba(120,150,210,.1)] px-[22px] pb-[22px] pt-[18px]">
                        <div className="mono-label mb-3.5 text-cyan">
                          {videosDe(e.id).length === 1 ? "Vídeo sobre este princípio" : "Vídeos sobre este princípio"}
                        </div>
                        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))" }}>
                          {videosDe(e.id).map((v) => (
                            <VideoCard key={v.id} video={v} />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-center text-[11.5px] text-muted">
        {numeradas.length} item(ns) · mantido pela Simplifica
      </p>
    </div>
  );
}

export default function PrinciplesPage() {
  return (
    <AuthGate>
      <AppShell>
        <Principles />
      </AppShell>
    </AuthGate>
  );
}
