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

  // Só oferece como filtro os princípios que realmente têm vídeo, já com a
  // contagem — assim o vendedor escolhe sabendo quantas aulas vai encontrar.
  const filtros = useMemo(() => {
    const contagem = new Map<string, number>();
    for (const v of rows ?? []) {
      for (const p of v.principleIds ?? []) {
        contagem.set(p, (contagem.get(p) ?? 0) + 1);
      }
    }
    return numerados
      .filter((p) => contagem.has(p.id ?? ""))
      .map((p) => ({ ...p, total: contagem.get(p.id ?? "") ?? 0 }));
  }, [rows, numerados]);

  const principioAtivo = filtros.find((p) => p.id === filtro) ?? null;

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

      {/* Filtro: um seletor no lugar de uma fileira de chips. Com muitos
          princípios os chips quebravam em 3 linhas e poluíam a tela. */}
      {rows.length > 0 && (filtros.length > 0 || rows.length > 4) && (
        <div className="dc-card mb-4 flex flex-wrap items-center gap-2.5 px-4 py-3">
          {filtros.length > 0 && (
            <label className="flex min-w-[240px] flex-1 items-center gap-2.5">
              <span className="mono-label flex-none" style={{ fontSize: 10.5 }}>Tema</span>
              <select
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="field flex-1"
                style={{ cursor: "pointer" }}
              >
                <option value="todos">Todos os temas · {rows.length} vídeos</option>
                {filtros.map((p) => (
                  <option key={p.id} value={p.id ?? ""}>
                    {p.number}. {p.title} · {p.total}
                  </option>
                ))}
              </select>
            </label>
          )}

          <input
            className="field max-w-[220px] flex-1"
            placeholder="Buscar vídeo…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          {(filtro !== "todos" || busca) && (
            <button
              onClick={() => {
                setFiltro("todos");
                setBusca("");
              }}
              className="flex-none rounded-lg px-3 py-2 text-[12px] font-medium transition"
              style={{ border: "1px solid rgba(120,150,210,.16)", color: "#79839c" }}
            >
              Limpar
            </button>
          )}
        </div>
      )}

      {/* Contexto do que está filtrado: sem isso o vendedor vê poucos vídeos
          e não entende por quê. */}
      {rows.length > 0 && (filtro !== "todos" || busca) && (
        <p className="mb-3.5 px-0.5 text-[12.5px] text-muted">
          {visiveis.length === 0
            ? "Nenhum vídeo encontrado"
            : `${visiveis.length} de ${rows.length} vídeos`}
          {principioAtivo && (
            <>
              {" · "}
              <span className="font-semibold text-cyan">
                {principioAtivo.number}. {principioAtivo.title}
              </span>
            </>
          )}
        </p>
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
