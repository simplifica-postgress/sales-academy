"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { adminPost } from "@/lib/adminApi";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import Spinner from "@/components/Spinner";
import TeamPanel from "@/components/TeamPanel";
import { initials } from "@/lib/ui";
import type { Company, UserProfile, UserRole } from "@/lib/types";

type UserRow = UserProfile & { id: string };

const ROLE_LABEL: Record<UserRole, string> = {
  seller: "Vendedor",
  manager: "Gestor",
  master: "Simplifica",
};

function CompanyDetail() {
  const params = useParams<{ companyId: string }>();
  const companyId = params.companyId;
  const router = useRouter();

  const [company, setCompany] = useState<Company | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [renaming, setRenaming] = useState("");

  useEffect(() => {
    if (!companyId) return;
    const unsubC = onSnapshot(doc(db, "companies", companyId), (snap) => {
      setCompany(snap.exists() ? (snap.data() as Company) : null);
      setLoading(false);
    });
    const unsubU = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...(d.data() as UserProfile) })));
    });
    return () => {
      unsubC();
      unsubU();
    };
  }, [companyId]);

  async function call(uid: string, body: Record<string, unknown>, msg: string) {
    setError("");
    setNotice("");
    setBusyUid(uid);
    try {
      await adminPost("/api/admin/set-role", { uid, ...body });
      setNotice(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha na operação.");
    } finally {
      setBusyUid(null);
    }
  }

  async function rename() {
    if (!renaming.trim()) return;
    setError("");
    try {
      await adminPost("/api/admin/companies", { action: "rename", companyId, name: renaming });
      setRenaming("");
      setNotice("Nome atualizado.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao renomear.");
    }
  }

  async function removeCompany() {
    if (!confirm(`Excluir a pasta "${company?.name}"?\n\nNinguém é apagado: as pessoas voltam para "sem empresa" e o histórico é preservado.`)) return;
    try {
      await adminPost("/api/admin/companies", { action: "delete", companyId });
      router.push("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao excluir.");
    }
  }

  if (loading) return <div className="flex min-h-[50vh] items-center justify-center"><Spinner /></div>;
  if (!company) {
    return <div className="dc-card p-6"><p className="text-sm text-muted">Empresa não encontrada.</p></div>;
  }

  const members = users.filter((u) => u.companyId === companyId);
  const manager = members.find((u) => u.role === "manager");
  const outsiders = users.filter((u) => u.companyId !== companyId && u.role !== "master");

  return (
    <div className="fade-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mono-label" style={{ letterSpacing: "0.18em" }}>Empresa</div>
          <h1 className="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.015em] text-foreground">{company.name}</h1>
        </div>
        <button onClick={removeCompany} className="rounded-lg border border-[rgba(244,114,106,.35)] px-3.5 py-2 text-[12px] font-medium text-danger transition" style={{ background: "rgba(244,114,106,.06)" }}>
          Excluir pasta
        </button>
      </div>

      {notice && <p className="mb-3.5 rounded-[10px] border border-[rgba(87,201,138,.3)] bg-[rgba(87,201,138,.08)] px-3.5 py-2.5 text-[12.5px] text-success">{notice}</p>}
      {error && <p className="mb-3.5 rounded-[10px] border border-[rgba(244,114,106,.28)] bg-[rgba(244,114,106,.08)] px-3.5 py-2.5 text-[12.5px] text-danger">{error}</p>}

      <TeamPanel scope={{ companyId, isMaster: true }} />

      {/* Gestor da empresa */}
      <div className="dc-card mt-3.5 p-5">
        <div className="mono-label mb-3">Gestor da empresa</div>
        {manager ? (
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full border border-[rgba(90,124,255,.35)] text-[10.5px] font-semibold text-cyan">{initials(manager.name)}</span>
            <span className="flex-1 text-[13.5px] text-foreground">{manager.name} <span className="text-muted">· {manager.email}</span></span>
            <button onClick={() => call(manager.id, { role: "seller" }, "Gestor rebaixado para vendedor.")} disabled={busyUid === manager.id} className="rounded-lg border border-[rgba(120,150,210,.16)] px-3 py-1.5 text-[12px] font-medium text-muted transition hover:text-foreground disabled:opacity-50">
              Remover cargo de gestor
            </button>
          </div>
        ) : (
          <p className="text-[12.5px] leading-[1.6] text-muted">
            Esta empresa ainda não tem gestor. Promova alguém da lista abaixo — o gestor enxerga a equipe e testa a IA, mas <strong className="text-foreground">não</strong> adiciona pessoas nem muda papéis.
          </p>
        )}
      </div>

      {/* Pessoas na pasta */}
      <div className="dc-card mt-3.5 p-5">
        <div className="mono-label mb-3">Pessoas nesta empresa ({members.length})</div>
        {members.length === 0 ? (
          <p className="py-3 text-[13px] text-muted">Ninguém aqui ainda. Adicione da lista abaixo.</p>
        ) : (
          members.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 border-b border-[rgba(120,150,210,.09)] py-2.5 last:border-0">
              <span className="flex-1 truncate text-[13.5px] text-foreground">{m.name} <span className="text-muted">· {ROLE_LABEL[m.role]}</span></span>
              {m.role === "seller" && (
                <button onClick={() => call(m.id, { role: "manager" }, `${m.name.split(" ")[0]} agora é gestor desta empresa.`)} disabled={busyUid === m.id} className="rounded-lg border border-[rgba(90,124,255,.35)] px-3 py-1.5 text-[12px] font-medium text-cyan transition disabled:opacity-50">
                  Tornar gestor
                </button>
              )}
              <button onClick={() => call(m.id, { companyId: null }, `${m.name.split(" ")[0]} saiu da empresa.`)} disabled={busyUid === m.id} className="rounded-lg border border-[rgba(120,150,210,.16)] px-3 py-1.5 text-[12px] font-medium text-muted transition hover:text-foreground disabled:opacity-50">
                Tirar da pasta
              </button>
            </div>
          ))
        )}
      </div>

      {/* Adicionar pessoas */}
      <div className="dc-card mt-3.5 p-5">
        <div className="mono-label mb-3">Adicionar à empresa</div>
        {outsiders.length === 0 ? (
          <p className="py-3 text-[13px] text-muted">Não há ninguém fora desta empresa para adicionar.</p>
        ) : (
          outsiders.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center gap-3 border-b border-[rgba(120,150,210,.09)] py-2.5 last:border-0">
              <span className="flex-1 truncate text-[13.5px] text-foreground">
                {u.name || u.email} <span className="text-muted">· {u.companyId ? "em outra empresa" : "sem empresa"}</span>
              </span>
              <button onClick={() => call(u.id, { companyId }, `${(u.name || u.email).split(" ")[0]} entrou na empresa.`)} disabled={busyUid === u.id} className="rounded-lg border border-[rgba(90,124,255,.35)] px-3 py-1.5 text-[12px] font-medium text-cyan transition disabled:opacity-50">
                Adicionar
              </button>
            </div>
          ))
        )}
      </div>

      {/* Renomear */}
      <div className="dc-card mt-3.5 flex flex-wrap items-end gap-3 p-5">
        <div className="min-w-[240px] flex-1">
          <label className="mono-label mb-2 block" htmlFor="renomear">Renomear empresa</label>
          <input id="renomear" className="field" placeholder={company.name} value={renaming} onChange={(e) => setRenaming(e.target.value)} onKeyDown={(e) => e.key === "Enter" && rename()} />
        </div>
        <button onClick={rename} disabled={!renaming.trim()} className="rounded-[11px] border border-[rgba(120,150,210,.16)] px-4 py-[11px] text-[13px] font-medium text-muted transition hover:text-foreground disabled:opacity-50">
          Salvar
        </button>
      </div>

      <p className="mt-3.5 text-center text-[11.5px] text-muted">Sem vendedores? Eles aparecem em “Adicionar à empresa” assim que criarem a conta.</p>
    </div>
  );
}

export default function CompanyPage() {
  return (
    <AuthGate allow={["master"]}>
      <AppShell>
        <CompanyDetail />
      </AppShell>
    </AuthGate>
  );
}
