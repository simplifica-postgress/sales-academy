"use client";

import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { ref, uploadBytesResumable } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { adminPost } from "@/lib/adminApi";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import Spinner from "@/components/Spinner";
import VideoCard, { type VideoRow } from "@/components/VideoCard";
import { ACCEPTED_VIDEO_TYPES, MAX_UPLOAD_BYTES } from "@/lib/constants";
import { numberPrinciples, type PrincipleEntry } from "@/lib/principles";
import { youtubeId } from "@/lib/video";
import type { VideoLesson } from "@/lib/types";

function safeName(name: string): string {
  return name.replace(/[^\w.-]/g, "_").slice(-80);
}

function Videos() {
  const { user } = useAuth();
  const [rows, setRows] = useState<VideoRow[]>([]);
  const [principios, setPrincipios] = useState<PrincipleEntry[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [link, setLink] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [vinculos, setVinculos] = useState<string[]>([]);
  const [pct, setPct] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [editando, setEditando] = useState<VideoRow | null>(null);

  useEffect(() => {
    const unsubV = onSnapshot(
      collection(db, "videos"),
      (snap) => {
        setRows(
          snap.docs
            .map((d) => ({ id: d.id, ...(d.data() as VideoLesson) }))
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        );
        setCarregando(false);
      },
      // Sem este tratamento a lista ficava vazia em silêncio e parecia que
      // nada tinha sido publicado — quando o problema era permissão.
      (err) => {
        console.error("Falha ao ler os vídeos:", err);
        setErro("Não foi possível listar os vídeos. Publique as regras do Firestore para a coleção `videos`.");
        setCarregando(false);
      }
    );
    const unsubP = onSnapshot(
      collection(db, "knowledge"),
      (snap) => setPrincipios(snap.docs.map((d) => ({ id: d.id, ...(d.data() as PrincipleEntry) }))),
      (err) => console.error("Falha ao ler os princípios:", err)
    );
    return () => {
      unsubV();
      unsubP();
    };
  }, []);

  const numerados = useMemo(() => numberPrinciples(principios), [principios]);

  function limpar() {
    setTitulo("");
    setDescricao("");
    setLink("");
    setArquivo(null);
    setVinculos([]);
    setEditando(null);
  }

  function escolherArquivo(f: File | null) {
    setErro("");
    if (!f) return setArquivo(null);
    if (!ACCEPTED_VIDEO_TYPES.includes(f.type)) return setErro("Envie um vídeo MP4 ou MOV.");
    if (f.size > MAX_UPLOAD_BYTES) return setErro("Arquivo muito grande (máximo 500 MB).");
    setArquivo(f);
    if (!titulo) setTitulo(f.name.replace(/\.[^.]+$/, ""));
  }

  async function salvar() {
    setErro("");
    setAviso("");
    if (!titulo.trim()) return setErro("Dê um título ao vídeo.");

    // Edição: só metadados (o arquivo em si não muda).
    if (editando) {
      setSalvando(true);
      try {
        await adminPost("/api/admin/videos", {
          action: "update",
          id: editando.id,
          title: titulo,
          description: descricao,
          principleIds: vinculos,
        });
        setAviso("Vídeo atualizado.");
        limpar();
      } catch (e) {
        setErro(e instanceof Error ? e.message : "Falha ao salvar.");
      } finally {
        setSalvando(false);
      }
      return;
    }

    if (!arquivo && !link.trim()) {
      return setErro("Envie um arquivo ou cole o link do YouTube.");
    }
    if (link.trim() && !youtubeId(link)) {
      return setErro("Esse link do YouTube não parece válido.");
    }
    if (!user) return setErro("Sessão expirada. Entre novamente.");

    setSalvando(true);
    try {
      let filePath: string | undefined;
      if (arquivo) {
        // Sobe para a própria pasta (único lugar que as regras permitem);
        // o backend copia para a área pública de vídeos.
        setPct(0);
        filePath = `uploads/${user.uid}/aula-${Date.now()}-${safeName(arquivo.name)}`;
        const task = uploadBytesResumable(ref(storage, filePath), arquivo, {
          contentType: arquivo.type,
        });
        await new Promise<void>((resolve, reject) => {
          task.on(
            "state_changed",
            (s) => setPct(Math.round((s.bytesTransferred / s.totalBytes) * 100)),
            () => reject(new Error("Falha ao enviar o arquivo.")),
            () => resolve()
          );
        });
        setPct(null);
      }

      await adminPost("/api/admin/videos", {
        action: "create",
        title: titulo,
        description: descricao,
        youtubeUrl: arquivo ? undefined : link,
        filePath,
        principleIds: vinculos,
      });
      setAviso("Vídeo publicado. Vendedores e gestores já conseguem assistir.");
      limpar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao publicar.");
    } finally {
      setSalvando(false);
      setPct(null);
    }
  }

  async function alternarPublicacao(v: VideoRow) {
    setErro("");
    setAviso("");
    const publicando = v.enabled === false;
    try {
      await adminPost("/api/admin/videos", {
        action: "update",
        id: v.id,
        enabled: publicando,
      });
      setAviso(
        publicando
          ? `"${v.title}" publicado — vendedores e gestores já veem.`
          : `"${v.title}" ocultado.`
      );
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao alterar.");
    }
  }

  async function publicarTodosVinculados() {
    const alvos = rows.filter((v) => v.enabled === false && (v.principleIds ?? []).length > 0);
    if (alvos.length === 0) return;
    if (!confirm(`Publicar ${alvos.length} vídeo(s) que já têm princípio vinculado?`)) return;
    setErro("");
    setAviso("");
    try {
      for (const v of alvos) {
        await adminPost("/api/admin/videos", { action: "update", id: v.id, enabled: true });
      }
      setAviso(`${alvos.length} vídeo(s) publicados.`);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao publicar em lote.");
    }
  }

  async function remover(v: VideoRow) {
    if (!confirm(`Remover "${v.title}"?\n\nO arquivo também é apagado do servidor.`)) return;
    try {
      await adminPost("/api/admin/videos", { action: "delete", id: v.id });
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao remover.");
    }
  }

  function editar(v: VideoRow) {
    setEditando(v);
    setTitulo(v.title);
    setDescricao(v.description ?? "");
    setVinculos(v.principleIds ?? []);
    setAviso("");
    setErro("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const alternarVinculo = (id: string) =>
    setVinculos((v) => (v.includes(id) ? v.filter((x) => x !== id) : [...v, id]));

  return (
    <div className="fade-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="mono-label" style={{ letterSpacing: "0.18em" }}>Conteúdo</div>
          <h1 className="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.015em] text-foreground">Vídeos e aulas</h1>
          <p className="mt-2 max-w-[560px] text-[13.5px] leading-[1.6] text-muted">
            Envie o arquivo do vídeo ou cole um link do YouTube. Todos os vendedores e gestores assistem.
          </p>
        </div>
        <span className="inline-flex flex-none items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold" style={{ border: "1px solid rgba(120,150,210,.18)", background: "rgba(21,31,60,.5)", color: "#aeb9e6" }}>
          <span className="h-[7px] w-[7px] rounded-full bg-success" />
          {rows.length} vídeo{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      {/* Formulário */}
      <div className="dc-card mb-4 p-6">
        <div className="mono-label mb-3.5">{editando ? "Editar vídeo" : "Novo vídeo"}</div>

        <div className="grid gap-3.5 sm:grid-cols-2">
          <input className="field" placeholder="Título (ex.: Abertura consultiva em 15 segundos)" value={titulo} onChange={(e) => setTitulo(e.target.value)} />
          <input className="field" placeholder="Descrição curta (opcional)" value={descricao} onChange={(e) => setDescricao(e.target.value)} />
        </div>

        {!editando && (
          <div className="mt-4 grid items-stretch gap-4 md:grid-cols-[1.15fr_auto_1fr]">
            <div>
              <div className="mb-2 text-[13px] font-semibold text-foreground">Enviar arquivo</div>
              <label htmlFor="vf" className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[14px] px-5 py-6 text-center transition" style={{ border: `1.5px dashed ${arquivo ? "rgba(90,124,255,.55)" : "rgba(120,150,210,.28)"}`, background: arquivo ? "rgba(90,124,255,.06)" : "rgba(6,10,20,.35)" }}>
                <span className="flex h-[42px] w-[42px] items-center justify-center rounded-xl text-[20px]" style={{ background: "rgba(90,124,255,.14)", border: "1px solid rgba(90,124,255,.3)", color: "#9db2ff" }}>↥</span>
                <span className="text-[13.5px] font-semibold text-foreground">{arquivo ? arquivo.name : "Escolher um vídeo"}</span>
                <span className="text-[12px] text-muted">{arquivo ? `${(arquivo.size / 1048576).toFixed(1)} MB` : "MP4, MOV · o vídeo baixado do Instagram serve"}</span>
              </label>
              <input id="vf" type="file" accept={ACCEPTED_VIDEO_TYPES.join(",")} className="hidden" onChange={(e) => escolherArquivo(e.target.files?.[0] ?? null)} />
            </div>

            <div className="flex flex-row items-center justify-center gap-2.5 md:flex-col">
              <span className="h-px flex-1 md:h-auto md:w-px md:flex-1" style={{ background: "linear-gradient(90deg,transparent,rgba(120,150,210,.2),transparent)" }} />
              <span className="text-[11px] font-bold tracking-[0.12em] text-dim">OU</span>
              <span className="h-px flex-1 md:h-auto md:w-px md:flex-1" style={{ background: "linear-gradient(90deg,transparent,rgba(120,150,210,.2),transparent)" }} />
            </div>

            <div>
              <div className="mb-2 text-[13px] font-semibold text-foreground">Colar link do YouTube</div>
              <input className="field" placeholder="https://youtube.com/watch?v=… ou /shorts/…" value={link} onChange={(e) => setLink(e.target.value)} disabled={Boolean(arquivo)} />
              <p className="mt-2 text-[12px] leading-[1.55] text-muted">
                Dica: se o vídeo não pode ficar público, suba no YouTube como <strong className="text-foreground">não listado</strong> — só quem tem o link assiste.
              </p>
            </div>
          </div>
        )}

        {/* Vínculo com os Princípios */}
        {numerados.length > 0 && (
          <div className="mt-5">
            <div className="mb-2 text-[13px] font-semibold text-foreground">
              Aparece em quais Princípios e Casos? <span className="font-normal text-muted">(opcional)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {numerados.map((p) => {
                const on = vinculos.includes(p.id ?? "");
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => alternarVinculo(p.id ?? "")}
                    className="rounded-full px-3 py-[6px] text-[12px] font-medium transition"
                    style={{
                      border: `1px solid ${on ? "rgba(90,124,255,.5)" : "rgba(120,150,210,.16)"}`,
                      background: on ? "rgba(90,124,255,.12)" : "transparent",
                      color: on ? "#7f9bff" : "#79839c",
                    }}
                  >
                    {p.number}. {p.title.length > 42 ? p.title.slice(0, 42) + "…" : p.title}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {erro && <p className="mt-3.5 rounded-[10px] border border-[rgba(244,114,106,.28)] bg-[rgba(244,114,106,.08)] px-3.5 py-[11px] text-[13px] text-danger">{erro}</p>}
        {aviso && <p className="mt-3.5 rounded-[10px] border border-[rgba(87,201,138,.3)] bg-[rgba(87,201,138,.08)] px-3.5 py-[11px] text-[13px] text-success">{aviso}</p>}

        <div className="mt-4 flex flex-wrap gap-2.5">
          <button onClick={salvar} disabled={salvando} className="btn-primary rounded-[11px] px-5 py-[12px] text-[13.5px] font-semibold disabled:opacity-50">
            {salvando ? (pct !== null ? `Enviando… ${pct}%` : "Salvando…") : editando ? "Salvar alterações" : "Publicar vídeo"}
          </button>
          {editando && (
            <button onClick={limpar} className="rounded-[11px] border border-[rgba(120,150,210,.16)] px-5 py-[12px] text-[13px] font-medium text-muted transition hover:text-foreground">
              Cancelar
            </button>
          )}
        </div>
      </div>

      {/* Grade */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 px-0.5">
        <span className="mono-label">
          Vídeos ({rows.filter((v) => v.enabled !== false).length} publicados ·{" "}
          {rows.filter((v) => v.enabled === false).length} ocultos)
        </span>
        {rows.some((v) => v.enabled === false && (v.principleIds ?? []).length > 0) && (
          <button
            onClick={publicarTodosVinculados}
            className="rounded-lg px-3 py-1.5 text-[12px] font-semibold transition"
            style={{ border: "1px solid rgba(87,201,138,.45)", background: "rgba(87,201,138,.12)", color: "#57c98a" }}
          >
            Publicar os que já têm princípio
          </button>
        )}
      </div>
      {rows.some((v) => v.enabled === false) && (
        <p className="mb-3.5 text-[12.5px] leading-[1.6] text-muted">
          Vídeo <strong className="text-foreground">oculto</strong> não aparece para vendedores nem gestores. Use o botão <strong className="text-foreground">publicar</strong> no card quando estiver revisado.
        </p>
      )}

      {carregando ? (
        <div className="dc-card flex justify-center py-12"><Spinner /></div>
      ) : rows.length === 0 ? (
        <div className="dc-card px-6 py-12 text-center">
          <p className="text-[13.5px] text-muted">Nenhum vídeo ainda. Publique o primeiro acima.</p>
        </div>
      ) : (
        <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(216px, 1fr))" }}>
          {rows.map((v) => (
            <VideoCard
              key={v.id}
              video={v}
              onToggle={() => alternarPublicacao(v)}
              onRemove={() => remover(v)}
              onEdit={() => editar(v)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function VideosPage() {
  return (
    <AuthGate allow={["master"]}>
      <AppShell>
        <Videos />
      </AppShell>
    </AuthGate>
  );
}
