"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { adminPost } from "@/lib/adminApi";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import Spinner from "@/components/Spinner";
import TeamPanel from "@/components/TeamPanel";
import { RETENTION_DAYS } from "@/lib/constants";
import type { Company, UserProfile } from "@/lib/types";

type CompanyRow = Company & { id: string };

function RetentionCard() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");

  async function run() {
    setError("");
    setResult("");
    setRunning(true);
    try {
      const r = await adminPost<{ deleted: number; scanned: number }>("/api/admin/retention", {});
      setResult(
        r.deleted === 0
          ? "Nenhuma gravação venceu o prazo — nada a apagar."
          : `${r.deleted} gravação(ões) apagada(s). As análises foram preservadas.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na limpeza.");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="dc-card mt-3.5 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[640px]">
          <div className="mono-label mb-1.5">Privacidade · retenção de gravações</div>
          <p className="text-[12.5px] leading-[1.6] text-muted">
            As gravações são apagadas após <strong className="text-foreground">{RETENTION_DAYS} dias</strong>, cumprida a finalidade de gerar a análise. <strong className="text-foreground">As análises são preservadas</strong> — o histórico do vendedor não perde nada.
          </p>
        </div>
        <button onClick={run} disabled={running} className="flex-none rounded-lg border border-[rgba(120,150,210,.16)] bg-card-alt px-3.5 py-2 text-[12px] font-medium text-muted transition hover:border-[rgba(90,124,255,.5)] hover:text-foreground disabled:opacity-50">
          {running ? "Executando…" : "Executar limpeza agora"}
        </button>
      </div>
      {result && <p className="mt-3 rounded-[10px] border border-[rgba(127,155,255,.3)] bg-[rgba(127,155,255,.08)] px-3.5 py-2.5 text-[12.5px] text-cyan">{result}</p>}
      {error && <p className="mt-3 rounded-[10px] border border-[rgba(244,114,106,.28)] bg-[rgba(244,114,106,.08)] px-3.5 py-2.5 text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}

/** Painel do master: as empresas como pastas. */
function MasterPanel() {
  const router = useRouter();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [users, setUsers] = useState<(UserProfile & { id: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubC = onSnapshot(collection(db, "companies"), (snap) => {
      setCompanies(
        snap.docs
          .map((d) => ({ id: d.id, ...(d.data() as Company) }))
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setLoading(false);
    });
    const unsubU = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as UserProfile) })));
    });
    return () => {
      unsubC();
      unsubU();
    };
  }, []);

  async function createCompany() {
    if (!newName.trim()) return;
    setError("");
    setBusy(true);
    try {
      await adminPost("/api/admin/companies", { action: "create", name: newName });
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar empresa.");
    } finally {
      setBusy(false);
    }
  }

  const unassigned = users.filter((u) => !u.companyId && u.role === "seller");

  return (
    <div className="fade-up">
      <div className="mb-6">
        <div className="mono-label" style={{ letterSpacing: "0.18em" }}>Painel Simplifica</div>
        <h1 className="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.015em] text-foreground">Empresas</h1>
        <p className="mt-2 text-[13px] text-muted">Cada empresa é uma pasta: o gestor dela vê só os vendedores que estão aqui dentro.</p>
      </div>

      <div className="dc-card mb-3.5 flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-[240px] flex-1">
          <label className="mono-label mb-2 block" htmlFor="nova-empresa">Nova empresa</label>
          <input id="nova-empresa" className="field" placeholder="Ex.: Construtora Alfa" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && createCompany()} />
        </div>
        <button onClick={createCompany} disabled={busy || !newName.trim()} className="btn-primary rounded-[11px] px-5 py-[12px] text-[13.5px] font-semibold disabled:opacity-50">
          {busy ? "Criando…" : "Criar pasta"}
        </button>
      </div>
      {error && <p className="mb-3.5 rounded-[10px] border border-[rgba(244,114,106,.28)] bg-[rgba(244,114,106,.08)] px-3.5 py-2.5 text-[12.5px] text-danger">{error}</p>}

      {loading ? (
        <div className="dc-card flex justify-center py-12"><Spinner /></div>
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {companies.map((c) => {
            const members = users.filter((u) => u.companyId === c.id);
            const sellers = members.filter((u) => u.role === "seller");
            const manager = members.find((u) => u.role === "manager");
            return (
              <button key={c.id} onClick={() => router.push(`/admin/empresa/${c.id}`)} className="dc-card p-5 text-left transition hover:border-[rgba(90,124,255,.45)]">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[10px] text-cyan" style={{ background: "rgba(90,124,255,.12)", border: "1px solid rgba(90,124,255,.3)" }}>
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M3 8a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-foreground">{c.name}</span>
                </div>
                <div className="mt-3.5 flex flex-wrap gap-2 text-[11.5px]">
                  <span className="rounded-full px-2.5 py-1 text-cyan" style={{ background: "rgba(127,155,255,.08)", border: "1px solid rgba(127,155,255,.22)" }}>{sellers.length} vendedor(es)</span>
                  <span className="rounded-full px-2.5 py-1" style={manager ? { color: "#57c98a", background: "rgba(87,201,138,.1)", border: "1px solid rgba(87,201,138,.3)" } : { color: "#f4726a", background: "rgba(244,114,106,.1)", border: "1px solid rgba(244,114,106,.3)" }}>
                    {manager ? `Gestor: ${manager.name.split(" ")[0]}` : "Sem gestor"}
                  </span>
                </div>
              </button>
            );
          })}

          {companies.length === 0 && (
            <p className="dc-card px-6 py-10 text-center text-sm text-muted">Nenhuma empresa ainda. Crie a primeira pasta acima.</p>
          )}
        </div>
      )}

      {unassigned.length > 0 && (
        <div className="dc-card mt-3.5 p-5">
          <div className="mono-label mb-2" style={{ color: "#f5b661" }}>Sem empresa</div>
          <p className="text-[12.5px] leading-[1.6] text-muted">
            <strong className="text-foreground">{unassigned.length} vendedor(es)</strong> se cadastraram e ainda não estão em nenhuma pasta. Enquanto isso, nenhum gestor os enxerga.{" "}
            <button onClick={() => router.push("/admin/usuarios")} className="font-semibold text-cyan hover:text-cyan-light">Vincular agora →</button>
          </p>
        </div>
      )}

      <RetentionCard />
    </div>
  );
}

/** Painel do gestor: só a própria empresa. */
function ManagerPanel() {
  const { profile } = useAuth();
  const companyId = profile?.companyId ?? null;

  if (!companyId) {
    return (
      <div className="fade-up dc-card p-6">
        <div className="mono-label mb-2" style={{ color: "#f5b661" }}>Sem empresa vinculada</div>
        <p className="text-[13.5px] leading-[1.6] text-muted">
          Sua conta de gestor ainda não está ligada a nenhuma empresa. Peça à Simplifica para vincular você a uma pasta — só depois disso a sua equipe aparece aqui.
        </p>
      </div>
    );
  }

  return (
    <div className="fade-up">
      <div className="mb-6">
        <div className="mono-label" style={{ letterSpacing: "0.18em" }}>Painel do gestor</div>
        <h1 className="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.015em] text-foreground">Acompanhamento da equipe</h1>
      </div>
      <TeamPanel scope={{ companyId, isMaster: false }} emptyLabel="Nenhum vendedor na sua empresa ainda." />
    </div>
  );
}

function AdminHome() {
  const { profile } = useAuth();
  return profile?.role === "master" ? <MasterPanel /> : <ManagerPanel />;
}

export default function AdminPage() {
  return (
    <AuthGate allow={["manager", "master"]}>
      <AppShell>
        <AdminHome />
      </AppShell>
    </AuthGate>
  );
}
