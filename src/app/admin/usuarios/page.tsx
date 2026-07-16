"use client";

import { useEffect, useState, type FormEvent } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { adminPost } from "@/lib/adminApi";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import Spinner from "@/components/Spinner";
import { initials } from "@/lib/ui";
import type { UserProfile, UserRole } from "@/lib/types";

type Row = UserProfile & { uid: string };

function Users() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Formulário de criação
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("seller");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snap) => {
        setRows(
          snap.docs
            .map((d) => ({ uid: d.id, ...(d.data() as UserProfile) }))
            .sort((a, b) => {
              // Gestores primeiro, depois por nome.
              if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
              return (a.name || "").localeCompare(b.name || "");
            })
        );
        setLoading(false);
      },
      (err) => {
        console.error(err);
        setError("Não foi possível carregar os usuários.");
        setLoading(false);
      }
    );
    return unsub;
  }, []);

  async function changeRole(uid: string, next: UserRole) {
    setError("");
    setNotice("");
    setBusyUid(uid);
    try {
      await adminPost("/api/admin/set-role", { uid, role: next });
      setNotice(
        next === "admin"
          ? "Acesso de gestor concedido."
          : "Usuário voltou a ser vendedor."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao alterar o papel.");
    } finally {
      setBusyUid(null);
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    setCreating(true);
    try {
      await adminPost("/api/admin/create-user", { name, email, password, role });
      setNotice(`Conta criada para ${email}.`);
      setName("");
      setEmail("");
      setPassword("");
      setRole("seller");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar a conta.");
    } finally {
      setCreating(false);
    }
  }

  const admins = rows.filter((r) => r.role === "admin").length;

  return (
    <div className="fade-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mono-label" style={{ letterSpacing: "0.18em" }}>Gestão de acessos</div>
          <h1 className="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.015em] text-foreground">Usuários</h1>
          <p className="mt-1.5 text-[13px] text-muted">
            {rows.length} conta{rows.length === 1 ? "" : "s"} · {admins} gestor{admins === 1 ? "" : "es"}
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary rounded-[10px] px-[18px] py-2.5 text-[13px] font-semibold">
          {showForm ? "Fechar" : "+ Nova conta"}
        </button>
      </div>

      {notice && <p className="mb-3.5 rounded-[10px] border border-[rgba(0,203,255,.3)] bg-[rgba(0,203,255,.08)] px-3.5 py-[11px] text-[13px] text-cyan">{notice}</p>}
      {error && <p className="mb-3.5 rounded-[10px] border border-[rgba(255,90,80,.28)] bg-[rgba(255,90,80,.08)] px-3.5 py-[11px] text-[13px] text-danger">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="dc-card mb-3.5 p-6">
          <div className="mono-label mb-3">Criar conta</div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder="Nome completo" required />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="field" placeholder="email@empresa.com" required />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="text" className="field" placeholder="Senha (mín. 6 caracteres)" minLength={6} required />
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="field" style={{ cursor: "pointer" }}>
              <option value="seller">Vendedor</option>
              <option value="admin">Gestor (admin)</option>
            </select>
          </div>
          <p className="mt-3 text-[12px] text-muted">
            A pessoa entra com esse e-mail e senha. O vendedor preenche o perfil no primeiro acesso.
          </p>
          <button type="submit" disabled={creating} className="btn-primary mt-4 rounded-[10px] px-5 py-[11px] text-[13px] font-semibold disabled:opacity-50">
            {creating ? "Criando…" : "Criar conta"}
          </button>
        </form>
      )}

      <div className="dc-card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : rows.length === 0 ? (
          <p className="px-6 py-10 text-center text-sm text-muted">Nenhum usuário ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid items-center gap-3 border-b border-[rgba(0,45,115,.5)] px-[22px] py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted" style={{ gridTemplateColumns: "1.6fr 1.4fr 110px 150px" }}>
                <span>Nome</span><span>E-mail</span><span>Papel</span><span className="text-right">Ação</span>
              </div>
              {rows.map((r) => {
                const isAdmin = r.role === "admin";
                const isSelf = r.uid === user?.uid;
                return (
                  <div key={r.uid} className="grid items-center gap-3 border-b border-[rgba(0,45,115,.25)] px-[22px] py-3 last:border-0" style={{ gridTemplateColumns: "1.6fr 1.4fr 110px 150px" }}>
                    <span className="flex min-w-0 items-center gap-[11px]">
                      <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full border border-[rgba(0,135,248,.35)] text-[10.5px] font-semibold text-cyan" style={{ background: "linear-gradient(135deg, rgba(0,82,185,.35), rgba(0,203,255,.14))" }}>{initials(r.name)}</span>
                      <span className="min-w-0 truncate text-[13.5px] font-semibold text-foreground">
                        {r.name || "—"}{isSelf && <span className="ml-1.5 text-[11px] font-normal text-muted">(você)</span>}
                      </span>
                    </span>
                    <span className="truncate text-[12.5px] text-muted">{r.email}</span>
                    <span>
                      <span className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-semibold" style={isAdmin
                        ? { color: "#00cbff", background: "rgba(0,203,255,.07)", border: "1px solid rgba(0,203,255,.25)" }
                        : { color: "#9db2c3", background: "#152946", border: "1px solid rgba(0,45,115,.5)" }}>
                        {isAdmin ? "Gestor" : "Vendedor"}
                      </span>
                    </span>
                    <span className="text-right">
                      {isSelf ? (
                        <span className="text-[11.5px] text-muted">—</span>
                      ) : (
                        <button
                          onClick={() => changeRole(r.uid, isAdmin ? "seller" : "admin")}
                          disabled={busyUid === r.uid}
                          className="rounded-lg border px-3 py-1.5 text-[12px] font-medium transition disabled:opacity-50"
                          style={isAdmin
                            ? { borderColor: "rgba(255,90,80,.35)", color: "#ff8d85", background: "rgba(255,90,80,.06)" }
                            : { borderColor: "rgba(0,135,248,.5)", color: "#00cbff", background: "rgba(0,135,248,.08)" }}
                        >
                          {busyUid === r.uid ? "…" : isAdmin ? "Remover gestor" : "Tornar gestor"}
                        </button>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <p className="mt-3.5 text-center text-[12px] text-muted">
        Gestores veem toda a equipe e a base de conhecimento. Você não pode remover o próprio acesso.
      </p>
    </div>
  );
}

export default function UsersPage() {
  return (
    <AuthGate requireAdmin>
      <AppShell>
        <Users />
      </AppShell>
    </AuthGate>
  );
}
