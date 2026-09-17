"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Spinner from "@/components/Spinner";

type Atual = {
  texto: string;
  atualizadoEm: string | null;
  atualizadoPor: string | null;
  padrao: boolean;
};

type Versao = {
  id: string;
  caracteres: number;
  trecho: string;
  substituidaEm: string | null;
  autor: string | null;
};

const CHAVE_AUTOR = "reunioesAutor";

function dataHora(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function GuiaReunioesPage() {
  const router = useRouter();
  const [carregando, setCarregando] = useState(true);
  const [atual, setAtual] = useState<Atual | null>(null);
  const [versoes, setVersoes] = useState<Versao[]>([]);
  const [minimo, setMinimo] = useState(200);
  const [maximo, setMaximo] = useState(120000);

  const [texto, setTexto] = useState("");
  const [autor, setAutor] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");

  const alterado = atual !== null && texto.trim() !== atual.texto.trim();

  function aplicar(d: { atual: Atual; versoes?: Versao[]; min?: number; max?: number }) {
    setAtual(d.atual);
    setTexto(d.atual.texto);
    if (d.versoes) setVersoes(d.versoes);
    if (d.min) setMinimo(d.min);
    if (d.max) setMaximo(d.max);
  }

  async function recarregar() {
    const r = await fetch("/api/reunioes/guia");
    if (r.status === 401) return router.replace("/reunioes");
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(d.error ?? "Não foi possível carregar o guia.");
    aplicar(d);
  }

  useEffect(() => {
    fetch("/api/reunioes/guia")
      .then(async (r) => {
        if (r.status === 401) {
          // Sem a senha do time: a tela principal é quem pede.
          router.replace("/reunioes");
          return;
        }
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error ?? "Não foi possível carregar o guia.");
        aplicar(d);
        try {
          setAutor(localStorage.getItem(CHAVE_AUTOR) ?? "");
        } catch {
          /* navegador sem armazenamento: o nome só não fica lembrado */
        }
        setCarregando(false);
      })
      .catch((e) => {
        setErro(e instanceof Error ? e.message : "Falha ao carregar.");
        setCarregando(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fechar a aba com alteração não salva perde o trabalho: avisa antes.
  useEffect(() => {
    if (!alterado) return;
    const segurar = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", segurar);
    return () => window.removeEventListener("beforeunload", segurar);
  }, [alterado]);

  function lembrarAutor(nome: string) {
    setAutor(nome);
    try {
      localStorage.setItem(CHAVE_AUTOR, nome);
    } catch {
      /* ignora */
    }
  }

  async function enviar(corpo: Record<string, unknown>, sucesso: string) {
    setErro("");
    setAviso("");
    setSalvando(true);
    try {
      const r = await fetch("/api/reunioes/guia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...corpo, autor }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error ?? "Não foi possível salvar.");
      await recarregar();
      setAviso(sucesso);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  function voltar() {
    if (alterado && !confirm("Você tem alterações não salvas. Sair mesmo assim?")) return;
    router.push("/reunioes");
  }

  if (carregando) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const tamanho = texto.trim().length;
  const curto = tamanho < minimo;
  const longo = tamanho > maximo;

  return (
    <main className="fade-up mx-auto w-full max-w-[900px] px-4 py-8 lg:px-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <button
          onClick={voltar}
          className="inline-flex items-center gap-2 rounded-lg border border-[rgba(120,150,210,.16)] bg-card-alt px-3.5 py-2 text-[12.5px] font-medium text-muted transition hover:border-[rgba(90,124,255,.5)] hover:text-foreground"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Todas as reuniões
        </button>
        <Image src="/logo.png" alt="Simplifica" width={120} height={32} style={{ width: 120, height: "auto" }} />
      </div>

      <div className="mb-5">
        <div className="mono-label" style={{ letterSpacing: "0.18em" }}>
          Análise de reuniões · uso interno
        </div>
        <h1 className="mt-2 text-[26px] font-semibold leading-tight tracking-[-0.015em] text-foreground">
          Guia da análise
        </h1>
        <p className="mt-2 max-w-[62ch] text-[13.5px] leading-[1.65] text-muted">
          É este texto que a IA usa como régua para avaliar as reuniões. O que você mudar aqui vale a
          partir da próxima análise — as já feitas não mudam. Toda alteração guarda a versão anterior,
          então dá para voltar atrás.
        </p>
      </div>

      <div className="dc-card mb-3.5 p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <span className="text-[12.5px] text-muted">
            {atual?.padrao ? (
              <>Versão original, ainda sem edições.</>
            ) : (
              <>
                Editado{atual?.atualizadoPor ? <> por <strong className="text-foreground">{atual.atualizadoPor}</strong></> : null} em{" "}
                {dataHora(atual?.atualizadoEm ?? null)}
              </>
            )}
          </span>
          {alterado && (
            <span
              className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
              style={{ color: "#f5b661", background: "rgba(245,182,97,.1)", border: "1px solid rgba(245,182,97,.32)" }}
            >
              Alterações não salvas
            </span>
          )}
        </div>

        <label htmlFor="guia" className="sr-only">
          Texto do guia
        </label>
        <textarea
          id="guia"
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value);
            setAviso("");
          }}
          spellCheck
          className="field"
          style={{ minHeight: "58vh", resize: "vertical", lineHeight: 1.7, fontSize: 13.5 }}
        />

        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
          <span style={{ color: curto || longo ? "#f4726a" : "#79839c" }} className="tabular-nums">
            {tamanho.toLocaleString("pt-BR")} caracteres
            {curto && ` · mínimo de ${minimo}`}
            {longo && ` · máximo de ${maximo.toLocaleString("pt-BR")}`}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <label htmlFor="autor" className="mono-label mb-1.5 block">
              Seu nome{" "}
              <span className="lowercase" style={{ color: "rgba(157,178,195,.6)", letterSpacing: 0 }}>
                (fica no histórico)
              </span>
            </label>
            <input
              id="autor"
              value={autor}
              onChange={(e) => lembrarAutor(e.target.value)}
              className="field"
              placeholder="Ex.: Thiago"
              maxLength={60}
            />
          </div>
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => atual && setTexto(atual.texto)}
              disabled={!alterado || salvando}
              className="rounded-[11px] border border-[rgba(120,150,210,.2)] px-4 py-[11px] text-[13px] font-medium text-muted transition hover:text-foreground disabled:opacity-40"
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={() => enviar({ texto }, "Guia salvo. A próxima análise já usa esta versão.")}
              disabled={!alterado || curto || longo || salvando}
              className="btn-primary rounded-[11px] px-5 py-[11px] text-sm font-semibold disabled:opacity-40"
            >
              {salvando ? "Salvando…" : "Salvar guia"}
            </button>
          </div>
        </div>

        {aviso && (
          <p
            className="mt-3.5 rounded-[10px] px-3.5 py-[11px] text-[13px]"
            style={{ color: "#57c98a", background: "rgba(87,201,138,.08)", border: "1px solid rgba(87,201,138,.3)" }}
          >
            {aviso}
          </p>
        )}
        {erro && (
          <p className="mt-3.5 rounded-[10px] border border-[rgba(244,114,106,.28)] bg-[rgba(244,114,106,.08)] px-3.5 py-[11px] text-[13px] text-danger">
            {erro}
          </p>
        )}
      </div>

      <div className="dc-card p-6">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
          <div className="mono-label">Versões anteriores</div>
          {!atual?.padrao && (
            <button
              type="button"
              disabled={salvando}
              onClick={() => {
                if (confirm("Voltar ao guia original? A versão atual fica guardada no histórico.")) {
                  enviar({ voltarAoPadrao: true }, "Guia original restaurado.");
                }
              }}
              className="text-[12px] font-medium text-cyan transition hover:text-foreground disabled:opacity-40"
            >
              Voltar ao guia original
            </button>
          )}
        </div>
        <p className="mb-3 text-[12px] text-muted">Cada vez que alguém salva, a versão que estava em uso vem para cá.</p>

        {versoes.length === 0 ? (
          <p className="py-2 text-[13px] text-muted">Nenhuma alteração ainda.</p>
        ) : (
          <div className="flex flex-col">
            {versoes.map((v) => (
              <div
                key={v.id}
                className="flex flex-wrap items-center gap-3 border-b border-[rgba(120,150,210,.09)] py-3 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-foreground">
                    Substituída em {dataHora(v.substituidaEm)}
                    {v.autor ? <span className="font-normal text-muted"> · por {v.autor}</span> : null}
                  </div>
                  <div className="mt-0.5 truncate text-[12px] text-muted">
                    {v.caracteres.toLocaleString("pt-BR")} caracteres · {v.trecho}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={salvando}
                  onClick={() => {
                    if (
                      (!alterado || confirm("Suas alterações não salvas serão perdidas. Continuar?")) &&
                      confirm("Restaurar esta versão? A atual fica guardada no histórico.")
                    ) {
                      enviar({ restaurar: v.id }, "Versão restaurada.");
                    }
                  }}
                  className="flex-none rounded-lg border border-[rgba(90,124,255,.35)] px-3 py-1.5 text-[12px] font-medium text-cyan transition hover:bg-[rgba(90,124,255,.08)] disabled:opacity-40"
                >
                  Restaurar
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
