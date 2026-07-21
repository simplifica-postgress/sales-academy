"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import Spinner from "@/components/Spinner";
import { kindOf, numberPrinciples, type PrincipleKind } from "@/lib/principles";

interface Entry {
  id: string;
  title: string;
  source?: string;
  content: string;
  order: number;
  enabled: boolean;
  kind?: PrincipleKind;
}

const empty = { title: "", source: "", content: "", kind: "principio" as PrincipleKind };

function Knowledge() {
  const [rows, setRows] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "knowledge"),
      (snap) => {
        setRows(
          snap.docs
            .map((d) => {
              const data = d.data();
              return {
                id: d.id,
                title: (data.title as string) ?? "",
                source: (data.source as string) ?? "",
                content: (data.content as string) ?? "",
                order: (data.order as number) ?? 0,
                enabled: data.enabled !== false,
                kind: data.kind as PrincipleKind | undefined,
              };
            })
            .sort((a, b) => a.order - b.order)
        );
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Não foi possível carregar os princípios.");
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  // Numeração oficial: mesma função usada no prompt da IA e na tela do
  // vendedor. Desativados ficam sem número, porque saem da lista da IA.
  const numeracao = new Map(
    numberPrinciples(rows.map((r) => ({ ...r }))).map((p) => [p.id, p.number])
  );
  const numeroDe = (id: string) => numeracao.get(id);

  function startNew() {
    setEditingId(null);
    setForm(empty);
    setShowForm(true);
    setNotice("");
    setError("");
  }

  function startEdit(e: Entry) {
    setEditingId(e.id);
    setForm({ title: e.title, source: e.source ?? "", content: e.content, kind: kindOf(e) });
    setShowForm(true);
    setNotice("");
    setError("");
  }

  async function handleSave(ev: FormEvent) {
    ev.preventDefault();
    if (!form.title.trim() || !form.content.trim()) {
      setError("Título e conteúdo são obrigatórios.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, "knowledge", editingId), {
          title: form.title.trim(),
          source: form.source.trim(),
          content: form.content.trim(),
          kind: form.kind,
          updatedAt: serverTimestamp(),
        });
        setNotice("Item atualizado. A IA já usa a nova versão e o vendedor já vê na seção.");
      } else {
        const nextOrder = rows.length ? Math.max(...rows.map((r) => r.order)) + 1 : 1;
        await addDoc(collection(db, "knowledge"), {
          title: form.title.trim(),
          source: form.source.trim(),
          content: form.content.trim(),
          kind: form.kind,
          order: nextOrder,
          enabled: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        setNotice("Item adicionado. A IA já usa a nova versão e o vendedor já vê na seção.");
      }
      setForm(empty);
      setEditingId(null);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      setError("Falha ao salvar. Verifique se você é gestor.");
    } finally {
      setSaving(false);
    }
  }

  async function toggle(e: Entry) {
    try {
      await updateDoc(doc(db, "knowledge", e.id), {
        enabled: !e.enabled,
        updatedAt: serverTimestamp(),
      });
    } catch {
      setError("Falha ao alterar o item.");
    }
  }

  async function remove(e: Entry) {
    if (!confirm(`Remover "${e.title}" dos Princípios e Casos?`)) return;
    try {
      await deleteDoc(doc(db, "knowledge", e.id));
      setNotice("Item removido.");
    } catch {
      setError("Falha ao remover o item.");
    }
  }

  const activeCount = rows.filter((r) => r.enabled).length;
  const chars = rows.filter((r) => r.enabled).reduce((s, r) => s + r.content.length, 0);

  return (
    <div className="fade-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mono-label" style={{ letterSpacing: "0.18em" }}>Cérebro da IA</div>
          <h1 className="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.015em] text-foreground">Princípios e Casos</h1>
          <p className="mt-1.5 max-w-[620px] text-[13px] leading-[1.6] text-muted">
            Tudo aqui é injetado no prompt da IA a cada análise. É o que faz ela avaliar pelo método da Simplifica, e não por técnica genérica.
          </p>
        </div>
        <button onClick={startNew} className="btn-primary rounded-[10px] px-[18px] py-2.5 text-[13px] font-semibold">+ Novo item</button>
      </div>

      <div className="mb-3.5 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="dc-card px-[22px] py-4">
          <div className="mono-label">Itens ativos</div>
          <div className="mt-1.5 text-[24px] font-semibold text-foreground">{activeCount}<span className="text-[14px] text-muted"> / {rows.length}</span></div>
        </div>
        <div className="dc-card px-[22px] py-4">
          <div className="mono-label">Tamanho no prompt</div>
          <div className="mt-1.5 text-[24px] font-semibold text-foreground">{(chars / 1000).toFixed(1)}<span className="text-[14px] text-muted"> mil caracteres</span></div>
        </div>
        <div className="dc-card px-[22px] py-4">
          <div className="mono-label">Custo por análise</div>
          <div className="mt-1.5 text-[13px] leading-[1.5] text-muted">Quanto maior a base, mais cara fica cada análise. Desative o que não usar.</div>
        </div>
      </div>

      {notice && <p className="mb-3.5 rounded-[10px] border border-[rgba(127,155,255,.3)] bg-[rgba(127,155,255,.08)] px-3.5 py-[11px] text-[13px] text-cyan">{notice}</p>}
      {error && <p className="mb-3.5 rounded-[10px] border border-[rgba(244,114,106,.28)] bg-[rgba(244,114,106,.08)] px-3.5 py-[11px] text-[13px] text-danger">{error}</p>}

      {showForm && (
        <form onSubmit={handleSave} className="dc-card mb-3.5 p-6">
          <div className="mono-label mb-3">{editingId ? "Editar item" : "Novo item"}</div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="field" placeholder="Título (ex.: Follow-up baseado no combinado)" required />
            <input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="field" placeholder="Fonte / referência (opcional)" />
            <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as PrincipleKind })} className="field" style={{ cursor: "pointer" }}>
              <option value="principio">Princípio — regra do método</option>
              <option value="caso">Caso — atendimento real de referência</option>
            </select>
          </div>
          <textarea
            value={form.content}
            onChange={(e) => setForm({ ...form, content: e.target.value })}
            rows={5}
            className="field mt-3.5"
            style={{ resize: "vertical" }}
            placeholder="O aprendizado e como aplicar. Escreva como orientação prática — é isso que a IA vai usar para avaliar e recomendar."
            required
          />
          <div className="mt-4 flex gap-2.5">
            <button type="submit" disabled={saving} className="btn-primary rounded-[10px] px-5 py-[11px] text-[13px] font-semibold disabled:opacity-50">
              {saving ? "Salvando…" : editingId ? "Salvar alterações" : "Adicionar"}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(empty); }} className="rounded-[10px] border border-[rgba(120,150,210,.16)] bg-card-alt px-5 py-[11px] text-[13px] font-medium text-muted transition hover:text-foreground">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="dc-card flex justify-center py-12"><Spinner /></div>
      ) : rows.length === 0 ? (
        <div className="dc-card px-6 py-12 text-center">
          <p className="text-[13.5px] text-muted">Nada cadastrado ainda. A IA vai usar apenas os critérios padrão.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {rows.map((e) => (
            <div key={e.id} className="dc-card p-5" style={{ opacity: e.enabled ? 1 : 0.55 }}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Número REAL (o mesmo que a IA cita e o vendedor vê).
                        Item desativado não entra na numeração. */}
                    <span className="font-mono text-[11px] font-semibold" style={{ color: numeroDe(e.id) ? "#7f9bff" : "#79839c" }}>
                      {numeroDe(e.id) ? String(numeroDe(e.id)).padStart(2, "0") : "—"}
                    </span>
                    <span className="text-[14.5px] font-semibold text-foreground">{e.title}</span>
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em]" style={kindOf(e) === "caso"
                      ? { color: "#57c98a", background: "rgba(87,201,138,.1)" }
                      : { color: "#7f9bff", background: "rgba(127,155,255,.1)" }}>
                      {kindOf(e) === "caso" ? "caso" : "princípio"}
                    </span>
                    {!e.enabled && <span className="rounded-full bg-indicator px-2 py-0.5 text-[10px] font-medium text-muted">desativado</span>}
                  </div>
                  {e.source && <div className="mt-1 font-mono text-[11px] text-muted">{e.source}</div>}
                  <p className="mt-2 text-[13px] leading-[1.6] text-muted">{e.content}</p>
                </div>
                <div className="flex flex-none gap-2">
                  <button onClick={() => toggle(e)} className="rounded-lg border border-[rgba(120,150,210,.16)] px-3 py-1.5 text-[12px] font-medium text-muted transition hover:text-foreground">
                    {e.enabled ? "Desativar" : "Ativar"}
                  </button>
                  <button onClick={() => startEdit(e)} className="rounded-lg border border-[rgba(90,124,255,.5)] px-3 py-1.5 text-[12px] font-medium text-cyan transition hover:text-cyan-light" style={{ background: "rgba(90,124,255,.08)" }}>
                    Editar
                  </button>
                  <button onClick={() => remove(e)} className="rounded-lg border border-[rgba(244,114,106,.35)] px-3 py-1.5 text-[12px] font-medium text-danger transition" style={{ background: "rgba(244,114,106,.06)" }}>
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function KnowledgePage() {
  return (
    <AuthGate allow={["master"]}>
      <AppShell>
        <Knowledge />
      </AppShell>
    </AuthGate>
  );
}
