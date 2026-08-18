"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Spinner from "@/components/Spinner";
import { ACCEPTED_AUDIO_TYPES, ACCEPTED_VIDEO_TYPES } from "@/lib/constants";
import { faixa } from "@/lib/reunioes";

const ACEITA = [...ACCEPTED_AUDIO_TYPES, ...ACCEPTED_VIDEO_TYPES].join(",");

type ItemLista = {
  id: string;
  titulo: string;
  participantes: string;
  notaGeral: number;
  probabilidadeFechamento: "alta" | "media" | "baixa";
  criadoEm: string | null;
};

const PROB = {
  alta: { texto: "Alta chance", cor: "#4ade9d", fundo: "rgba(74,222,157,.1)", borda: "rgba(74,222,157,.3)" },
  media: { texto: "Chance média", cor: "#f5c163", fundo: "rgba(245,193,99,.1)", borda: "rgba(245,193,99,.3)" },
  baixa: { texto: "Chance baixa", cor: "#f4726a", fundo: "rgba(244,114,106,.1)", borda: "rgba(244,114,106,.3)" },
} as const;

/** Fundo e cabeçalho comuns às três telas (senha, envio, lista). */
function Moldura({ children, largura = 560 }: { children: ReactNode; largura?: number }) {
  return (
    <main className="fade-up mx-auto w-full px-5 py-10" style={{ maxWidth: largura }}>
      <div className="mb-7 text-center">
        <Image
          src="/logo.png"
          alt="Simplifica"
          width={150}
          height={40}
          style={{ width: 150, height: "auto", margin: "0 auto" }}
          priority
        />
        <div className="mono-label mt-2.5" style={{ letterSpacing: "0.2em", fontSize: 10 }}>
          Análise de reuniões · uso interno
        </div>
      </div>
      {children}
    </main>
  );
}

export default function ReunioesPage() {
  const [carregando, setCarregando] = useState(true);
  const [configurado, setConfigurado] = useState(true);
  const [liberado, setLiberado] = useState(false);

  useEffect(() => {
    fetch("/api/reunioes/entrar")
      .then((r) => r.json())
      .then((d) => {
        setConfigurado(d.configurado !== false);
        setLiberado(Boolean(d.liberado));
      })
      .catch(() => setConfigurado(false))
      .finally(() => setCarregando(false));
  }, []);

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!configurado) {
    return (
      <Moldura>
        <div className="dc-card p-7 text-center">
          <p className="text-[14px] leading-[1.6] text-muted">
            Esta ferramenta ainda não foi configurada neste servidor.
            <br />
            Falta definir a senha do time.
          </p>
        </div>
      </Moldura>
    );
  }

  if (!liberado) return <TelaSenha aoEntrar={() => setLiberado(true)} />;
  return <Ferramenta />;
}

function TelaSenha({ aoEntrar }: { aoEntrar: () => void }) {
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function entrar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    setEnviando(true);
    try {
      const r = await fetch("/api/reunioes/entrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senha }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Não foi possível entrar.");
      aoEntrar();
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Não foi possível entrar.");
      setEnviando(false);
    }
  }

  return (
    <Moldura largura={400}>
      <form onSubmit={entrar} className="dc-card p-7">
        <label htmlFor="senha" className="mono-label mb-3 block">
          Senha do time
        </label>
        <input
          id="senha"
          type="password"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          className="field"
          placeholder="••••••••"
          autoFocus
          required
        />
        {erro && (
          <p className="mt-3 rounded-[10px] border border-[rgba(244,114,106,.28)] bg-[rgba(244,114,106,.08)] px-3.5 py-2.5 text-[13px] text-danger">
            {erro}
          </p>
        )}
        <button
          type="submit"
          disabled={enviando}
          className="btn-primary mt-4 w-full rounded-[11px] px-5 py-3 text-sm font-semibold disabled:opacity-60"
        >
          {enviando ? "Entrando…" : "Entrar"}
        </button>
        <p className="mt-4 text-center text-[11.5px] leading-[1.6] text-muted">
          Ferramenta interna da Simplifica.
          <br />
          O acesso fica salvo neste navegador por 30 dias.
        </p>
      </form>
    </Moldura>
  );
}

function Ferramenta() {
  const router = useRouter();
  const [lista, setLista] = useState<ItemLista[]>([]);
  const [carregandoLista, setCarregandoLista] = useState(true);

  const [modo, setModo] = useState<"arquivo" | "texto">("arquivo");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [texto, setTexto] = useState("");
  const [titulo, setTitulo] = useState("");
  const [participantes, setParticipantes] = useState("");
  const [contexto, setContexto] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [etapa, setEtapa] = useState("");
  const [pct, setPct] = useState<number | null>(null);
  const [erro, setErro] = useState("");

  const carregarLista = useCallback(() => {
    fetch("/api/reunioes/lista")
      .then((r) => r.json())
      .then((d) => setLista(d.reunioes ?? []))
      .catch(() => {})
      .finally(() => setCarregandoLista(false));
  }, []);

  useEffect(() => carregarLista(), [carregarLista]);

  async function sair() {
    await fetch("/api/reunioes/entrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sair: true }),
    });
    location.reload();
  }

  /**
   * Sobe a gravação direto para o Storage com barra de progresso real.
   * XMLHttpRequest, e não fetch, porque só ele informa o andamento do
   * envio — e uma reunião de 1 GB sem barra parece travada.
   */
  function enviarArquivo(url: string, f: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", f.type);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setPct(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () =>
        xhr.status >= 200 && xhr.status < 300
          ? resolve()
          : reject(new Error(`O envio falhou (código ${xhr.status}).`));
      xhr.onerror = () => reject(new Error("Falha de rede ao enviar a gravação."));
      xhr.send(f);
    });
  }

  async function analisar(e: FormEvent) {
    e.preventDefault();
    setErro("");
    if (modo === "arquivo" && !arquivo) return setErro("Escolha a gravação da reunião.");
    if (modo === "texto" && texto.trim().length < 40) {
      return setErro("Cole a transcrição da reunião (pelo menos 40 caracteres).");
    }

    setEnviando(true);
    try {
      const corpo: Record<string, unknown> = { titulo, participantes, contexto };

      if (modo === "arquivo" && arquivo) {
        setEtapa("Enviando a gravação");
        setPct(0);
        const pedido = await fetch("/api/reunioes/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nome: arquivo.name, tipo: arquivo.type }),
        });
        const dados = await pedido.json().catch(() => ({}));
        if (!pedido.ok) throw new Error(dados.error ?? "Não foi possível preparar o envio.");
        await enviarArquivo(dados.url, arquivo);
        corpo.caminho = dados.caminho;
      } else {
        corpo.textoColado = texto.trim();
      }

      setPct(null);
      setEtapa(modo === "arquivo" ? "Transcrevendo e analisando" : "Analisando a reunião");

      const r = await fetch("/api/reunioes/analisar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(corpo),
      });
      // Lê como texto primeiro: análise longa pode ser cortada pelo proxy e
      // voltar sem corpo, e aí .json() estouraria com um erro sem sentido.
      const bruto = await r.text();
      let d: { id?: string; error?: string } = {};
      if (bruto) {
        try {
          d = JSON.parse(bruto);
        } catch {
          /* corpo não-JSON */
        }
      }
      if (!r.ok || !d.id) throw new Error(d.error ?? "Falha ao analisar a reunião.");

      router.push(`/reunioes/${d.id}`);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Algo deu errado.");
      setEnviando(false);
      setPct(null);
    }
  }

  if (enviando) {
    return (
      <Moldura>
        <div className="dc-card px-8 py-11 text-center">
          <div
            className="mx-auto h-[52px] w-[52px] rounded-full border-[3px] border-indicator"
            style={{ borderTopColor: "#7f9bff", animation: "spin .9s linear infinite" }}
          />
          <div className="mt-6 text-base font-semibold text-foreground">
            {pct !== null ? `${etapa}… ${pct}%` : `${etapa}…`}
          </div>
          {pct !== null && (
            <div className="mx-auto mt-4 h-2 max-w-[330px] overflow-hidden rounded-full bg-indicator">
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${pct}%`, background: "linear-gradient(90deg,#4a6edc,#5a7cff,#7f9bff)" }}
              />
            </div>
          )}
          <p className="mt-4 text-[12.5px] leading-[1.6] text-muted">
            Reunião longa demora alguns minutos.
            <br />
            Não feche esta página.
          </p>
        </div>
      </Moldura>
    );
  }

  return (
    <Moldura largura={760}>
      <form onSubmit={analisar} className="dc-card mb-4 p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="mono-label">Analisar uma reunião</div>
          <button
            type="button"
            onClick={sair}
            className="text-[11.5px] text-muted transition hover:text-foreground"
          >
            Sair
          </button>
        </div>

        <div className="mb-3.5 grid grid-cols-2 gap-2">
          {(
            [
              { id: "arquivo", rotulo: "Gravação", sub: "áudio ou vídeo" },
              { id: "texto", rotulo: "Transcrição", sub: "colar texto" },
            ] as const
          ).map((m) => {
            const on = modo === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setModo(m.id);
                  setErro("");
                }}
                className="rounded-xl px-2 py-2.5 text-center transition"
                style={{
                  border: `1px solid ${on ? "rgba(90,124,255,.5)" : "rgba(120,150,210,.16)"}`,
                  background: on ? "rgba(90,124,255,.1)" : "transparent",
                }}
              >
                <span className="block text-[12.5px] font-semibold" style={{ color: on ? "#7f9bff" : "#cdd5e6" }}>
                  {m.rotulo}
                </span>
                <span className="mt-0.5 block text-[10.5px] text-muted">{m.sub}</span>
              </button>
            );
          })}
        </div>

        {modo === "arquivo" ? (
          <label
            htmlFor="grav"
            className="mb-3.5 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl px-5 py-[34px] text-center transition"
            style={{
              border: `1.5px dashed ${arquivo ? "rgba(90,124,255,.5)" : "rgba(120,150,210,.18)"}`,
              background: arquivo ? "rgba(90,124,255,.05)" : "rgba(2,13,35,.5)",
            }}
          >
            <span
              className="flex h-[44px] w-[44px] items-center justify-center rounded-[13px] border border-[rgba(90,124,255,.35)] text-cyan"
              style={{ background: "rgba(90,124,255,.1)" }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <rect x="3" y="5" width="18" height="14" rx="3" />
                <path d="M10.5 9.5v5l4-2.5z" fill="currentColor" stroke="none" />
              </svg>
            </span>
            <div className="text-sm font-semibold text-foreground">
              {arquivo ? arquivo.name : "Clique para escolher a gravação"}
            </div>
            <div className="font-mono text-[11.5px] text-muted">
              {arquivo
                ? `${(arquivo.size / 1024 / 1024).toFixed(1)} MB · clique para trocar`
                : "MP3, M4A, WAV, MP4, MOV"}
            </div>
            <input
              id="grav"
              type="file"
              accept={ACEITA}
              className="hidden"
              onChange={(e) => {
                setArquivo(e.target.files?.[0] ?? null);
                setErro("");
              }}
            />
          </label>
        ) : (
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={9}
            className="field mb-3.5"
            style={{ resize: "vertical" }}
            placeholder={"Cole aqui a transcrição da reunião.\n\nEx.:\nVendedor: Obrigado pelo tempo, Marcos…\nCliente: Imagina, vamos lá."}
          />
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="tit" className="mono-label mb-1.5 block">
              Título
            </label>
            <input
              id="tit"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              className="field"
              placeholder="Ex.: Reunião — Clínica Menegucci"
            />
          </div>
          <div>
            <label htmlFor="part" className="mono-label mb-1.5 block">
              Quem participou
            </label>
            <input
              id="part"
              value={participantes}
              onChange={(e) => setParticipantes(e.target.value)}
              className="field"
              placeholder="Ex.: Thiago e Gustavo"
            />
          </div>
        </div>

        <label htmlFor="ctx" className="mono-label mb-1.5 mt-3.5 block">
          Contexto{" "}
          <span className="lowercase" style={{ color: "rgba(157,178,195,.6)", letterSpacing: 0 }}>
            (opcional)
          </span>
        </label>
        <textarea
          id="ctx"
          value={contexto}
          onChange={(e) => setContexto(e.target.value)}
          rows={2}
          className="field"
          style={{ resize: "vertical" }}
          placeholder="Ex.: segunda reunião, proposta já enviada, decisor não estava presente…"
        />

        {erro && (
          <p className="mt-3.5 rounded-[10px] border border-[rgba(244,114,106,.28)] bg-[rgba(244,114,106,.08)] px-3.5 py-[11px] text-[13px] text-danger">
            {erro}
          </p>
        )}

        <button type="submit" className="btn-primary mt-4 w-full rounded-[11px] px-5 py-[13px] text-sm font-semibold">
          Analisar reunião
        </button>
      </form>

      <div className="dc-card p-6">
        <div className="mono-label mb-4">Reuniões analisadas ({lista.length})</div>
        {carregandoLista ? (
          <div className="py-6 text-center">
            <Spinner />
          </div>
        ) : lista.length === 0 ? (
          <p className="py-4 text-[13px] text-muted">
            Nenhuma reunião ainda. A primeira análise aparece aqui.
          </p>
        ) : (
          <div className="flex flex-col">
            {lista.map((r) => {
              const f = faixa(r.notaGeral);
              const p = PROB[r.probabilidadeFechamento] ?? PROB.baixa;
              const cor = f.tom === "bom" ? "#4ade9d" : f.tom === "medio" ? "#f5c163" : "#f4726a";
              const fundo =
                f.tom === "bom"
                  ? "rgba(74,222,157,.1)"
                  : f.tom === "medio"
                    ? "rgba(245,193,99,.1)"
                    : "rgba(244,114,106,.1)";
              return (
                <button
                  key={r.id}
                  onClick={() => router.push(`/reunioes/${r.id}`)}
                  className="flex items-center gap-3.5 border-b border-[rgba(120,150,210,.09)] py-3 text-left transition last:border-0 hover:opacity-80"
                >
                  <span
                    className="flex h-[42px] w-[42px] flex-none items-center justify-center rounded-xl font-display text-[15px] font-bold"
                    style={{ color: cor, background: fundo }}
                  >
                    {r.notaGeral}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold text-foreground">{r.titulo}</span>
                    <span className="mt-0.5 block truncate text-[12px] text-muted">
                      {r.participantes || "—"}
                      {r.criadoEm ? ` · ${new Date(r.criadoEm).toLocaleDateString("pt-BR")}` : ""}
                    </span>
                  </span>
                  <span
                    className="flex-none rounded-full px-2.5 py-1 text-[10.5px] font-bold"
                    style={{ color: p.cor, background: p.fundo, border: `1px solid ${p.borda}` }}
                  >
                    {p.texto}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Moldura>
  );
}
