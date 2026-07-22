"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import Spinner from "@/components/Spinner";
import VideoCard, { type VideoRow } from "@/components/VideoCard";
import { numberPrinciples, type PrincipleEntry } from "@/lib/principles";
import type { VideoLesson } from "@/lib/types";

function Aulas() {
  const [rows, setRows] = useState<VideoRow[] | null>(null);
  const [principios, setPrincipios] = useState<PrincipleEntry[]>([]);
  const [filtro, setFiltro] = useState<string>("todos");
  const [busca, setBusca] = useState("");

  useEffect(() => {
    const unsubV = onSnapshot(
      collection(db, "videos"),
      (snap) =>
        setRows(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as VideoLesson) }))
            // Vídeo oculto não aparece para o vendedor.
            .filter((v) => v.enabled !== false)
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        ),
      () => setRows([])
    );
    const unsubP = onSnapshot(
      collection(db, "knowledge"),
      (snap) => setPrincipios(snap.docs.map((d) => ({ id: d.id, ...(d.data() as PrincipleEntry) }))),
      () => setPrincipios([])
    );
    return () => {
      unsubV();
      unsubP();
    };
  }, []);

  const numerados = useMemo(() => numberPrinciples(principios), [principios]);

  // Só oferece como filtro os princípios que realmente têm vídeo.
  const filtros = useMemo(() => {
    const comVideo = new Set((rows ?? []).flatMap((v) => v.principleIds ?? []));
    return numerados.filter((p) => comVideo.has(p.id ?? ""));
  }, [rows, numerados]);

  const visiveis = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (rows ?? []).filter((v) => {
      if (filtro !== "todos" && !(v.principleIds ?? []).includes(filtro)) return false;
      if (!termo) return true;
      return (
        v.title.toLowerCase().includes(termo) ||
        (v.description ?? "").toLowerCase().includes(termo)
      );
    });
  }, [rows, filtro, busca]);

  if (rows === null) {
    return <div className="flex min-h-[50vh] items-center justify-center"><Spinner /></div>;
  }

  return (
    <div className="fade-up">
      <div className="mb-[22px] flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mono-label" style={{ letterSpacing: "0.18em" }}>Método Simplifica</div>
          <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.015em] text-foreground">Vídeos e aulas</h1>
          <p className="mt-2 max-w-[620px] text-[13.5px] leading-[1.6] text-muted">
            Exemplos práticos do método. Assista antes de gravar seu próximo atendimento.
          </p>
        </div>
        {rows.length > 0 && (
          <span className="inline-flex flex-none items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold" style={{ border: "1px solid rgba(120,150,210,.18)", background: "rgba(21,31,60,.5)", color: "#aeb9e6" }}>
            <span className="h-[7px] w-[7px] rounded-full bg-success" />
            {rows.length} vídeo{rows.length === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {rows.length > 0 && (filtros.length > 0 || rows.length > 4) && (
        <div className="mb-4 flex flex-wrap items-center gap-2.5">
          {[{ id: "todos", label: "Tudo" }, ...filtros.map((p) => ({ id: p.id ?? "", label: `${p.number}. ${p.title.length > 30 ? p.title.slice(0, 30) + "…" : p.title}` }))].map((f) => {
            const on = filtro === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setFiltro(f.id)}
                className="rounded-full px-3.5 py-[7px] text-[12.5px] font-medium transition"
                style={{
                  border: `1px solid ${on ? "rgba(90,124,255,.5)" : "rgba(120,150,210,.15)"}`,
                  background: on ? "rgba(90,124,255,.12)" : "transparent",
                  color: on ? "#7f9bff" : "#79839c",
                }}
              >
                {f.label}
              </button>
            );
          })}
          {rows.length > 4 && (
            <input className="field ml-auto max-w-[240px]" placeholder="Buscar vídeo…" value={busca} onChange={(e) => setBusca(e.target.value)} />
          )}
        </div>
      )}

      {rows.length === 0 ? (
        <div className="dc-card px-6 py-14 text-center">
          <p className="text-[13.5px] text-muted">Ainda não há vídeos publicados. A Simplifica está preparando o material.</p>
        </div>
      ) : visiveis.length === 0 ? (
        <div className="dc-card px-6 py-12 text-center">
          <p className="text-[13.5px] text-muted">Nenhum vídeo para esse filtro.</p>
        </div>
      ) : (
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(216px, 1fr))" }}>
          {visiveis.map((v) => (
            <VideoCard key={v.id} video={v} />
          ))}
        </div>
      )}

      {/* Ponte para a teoria: quem assistiu costuma querer ler o princípio. */}
      {rows.length > 0 && numerados.length > 0 && (
        <p className="mt-5 text-center text-[12.5px] text-muted">
          Cada vídeo se apoia num princípio do método —{" "}
          <a href="/principios" className="font-semibold text-cyan hover:text-cyan-light">ver Princípios e Casos →</a>
        </p>
      )}
    </div>
  );
}

export default function AulasPage() {
  return (
    <AuthGate>
      <AppShell>
        <Aulas />
      </AppShell>
    </AuthGate>
  );
}
