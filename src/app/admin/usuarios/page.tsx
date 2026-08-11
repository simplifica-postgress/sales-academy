"use client";

import { useEffect, useState, type FormEvent } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { adminPost } from "@/lib/adminApi";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import Spinner from "@/components/Spinner";
import SeloPlano from "@/components/SeloPlano";
import { accessReason } from "@/lib/subscription";
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
  const [busca, setBusca] = useState("");

  // Formulário de criação
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("seller");
  const [creating, setCreating] = useState(false);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [newCompany, setNewCompany] = useState("");

  useEffect(() => {
    const unsubC = onSnapshot(collection(db, "companies"), (snap) =>
      setCompanies(
        snap.docs
          .map((d) => ({ id: d.id, name: (d.data() as { name: string }).name }))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
    );
    return unsubC;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snap) => {
        setRows(
          snap.docs
            .map((d) => ({ uid: d.id, ...(d.data() as UserProfile) }))
            .sort((a, b) => {
              // Master, gestor e depois vendedor; dentro do papel, por nome.
              const rank = { master: 0, manager: 1, seller: 2 } as const;
              if (a.role !== b.role) return rank[a.role] - rank[b.role];
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

  const ROLE_LABEL: Record<UserRole, string> = {
    seller: "Vendedor",
    manager: "Gestor",
    master: "Simplifica",
  };

  /** Muda papel e/ou empresa. Só o master chega nesta tela. */
  async function patchUser(
    uid: string,
    body: { role?: UserRole; companyId?: string | null },
    msg: string
  ) {
    setError("");
    setNotice("");
    setBusyUid(uid);
    try {
      await adminPost("/api/admin/set-role", { uid, ...body });
      setNotice(msg);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao alterar o acesso.");
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
      await adminPost("/api/admin/create-user", {
        name,
        email,
        password,
        role,
        companyId: newCompany || null,
      });
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

  /** Já está sem acesso? (staff sempre entra, então nunca aparece como sem acesso) */
  const semAcesso = (r: Row) => accessReason(r) === "sem-acesso";

  /**
   * Encerra o acesso. O aviso é explícito sobre a cobrança porque essa é a
   * parte que dá problema: encerrar sem cancelar no Stripe cobraria a pessoa
   * todo mês por algo que ela não tem mais.
   */
  async function encerrarAcesso(r: Row) {
    const nome = r.name || r.email;
    const pagante = r.subscriptionStatus === "active" || r.subscriptionStatus === "past_due";
    const texto = pagante
      ? `Encerrar o acesso de ${nome}?\n\nA assinatura será CANCELADA no Stripe (para de cobrar) e o acesso cai imediatamente.`
      : `Encerrar o acesso de ${nome}?\n\nA pessoa perde o acesso imediatamente. Dá para devolver depois.`;
    if (!confirm(texto)) return;

    setError("");
    setNotice("");
    setBusyUid(r.uid);
    try {
      const res = await adminPost<{ stripeCancelado: boolean; aviso: string | null }>(
        "/api/admin/revogar-acesso",
        { uid: r.uid }
      );
      setNotice(
        res.aviso ??
          `Acesso de ${nome} encerrado${res.stripeCancelado ? " e cobrança cancelada" : ""}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao encerrar o acesso.");
    } finally {
      setBusyUid(null);
    }
  }

  /** Devolve o acesso como cortesia (sem cobrar). */
  async function devolverAcesso(r: Row) {
    setError("");
    setNotice("");
    setBusyUid(r.uid);
    try {
      await adminPost("/api/admin/revogar-acesso", { uid: r.uid, restaurar: true });
      setNotice(`${r.name || r.email} voltou a ter acesso (cortesia).`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao devolver o acesso.");
    } finally {
      setBusyUid(null);
    }
  }

  const admins = rows.filter((r) => r.role !== "seller").length;

  // Busca por nome ou e-mail. Sem acento e sem caixa: procurar "jose" acha
  // "José", que é como a pessoa digita quando está com pressa.
  const semAcento = (s: string) =>
    s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
  const termo = semAcento(busca.trim());
  const visiveis = termo
    ? rows.filter(
        (r) => semAcento(r.name ?? "").includes(termo) || semAcento(r.email ?? "").includes(termo)
      )
    : rows;

  return (
    <div className="fade-up">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="mono-label" style={{ letterSpacing: "0.18em" }}>Gestão de acessos</div>
          <h1 className="mt-2 text-[27px] font-semibold leading-tight tracking-[-0.015em] text-foreground">Usuários</h1>
          <p className="mt-1.5 text-[13px] text-muted">
            {termo
              ? `${visiveis.length} de ${rows.length} conta${rows.length === 1 ? "" : "s"}`
              : `${rows.length} conta${rows.length === 1 ? "" : "s"} · ${admins} gestor${admins === 1 ? "" : "es"}`}
          </p>
        </div>
        <button onClick={() => setShowForm((v) => !v)} className="btn-primary rounded-[10px] px-[18px] py-2.5 text-[13px] font-semibold">
          {showForm ? "Fechar" : "+ Nova conta"}
        </button>
      </div>

      {/* Busca: com dezenas de contas, rolar a lista para achar alguém é dor. */}
      <div className="relative mb-3.5">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
        </span>
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="field"
          style={{ paddingLeft: 38, paddingRight: busca ? 38 : undefined }}
          placeholder="Buscar por nome ou e-mail…"
          aria-label="Buscar conta por nome ou e-mail"
        />
        {busca && (
          <button
            type="button"
            onClick={() => setBusca("")}
            title="Limpar busca"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[15px] leading-none text-muted transition hover:text-foreground"
          >
            ×
          </button>
        )}
      </div>

      {notice && <p className="mb-3.5 rounded-[10px] border border-[rgba(127,155,255,.3)] bg-[rgba(127,155,255,.08)] px-3.5 py-[11px] text-[13px] text-cyan">{notice}</p>}
      {error && <p className="mb-3.5 rounded-[10px] border border-[rgba(244,114,106,.28)] bg-[rgba(244,114,106,.08)] px-3.5 py-[11px] text-[13px] text-danger">{error}</p>}

      {showForm && (
        <form onSubmit={handleCreate} className="dc-card mb-3.5 p-6">
          <div className="mono-label mb-3">Criar conta</div>
          <div className="grid gap-3.5 sm:grid-cols-2">
            <input value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder="Nome completo" required />
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="field" placeholder="email@empresa.com" required />
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="text" className="field" placeholder="Senha (mín. 6 caracteres)" minLength={6} required />
            <select value={role} onChange={(e) => setRole(e.target.value as UserRole)} className="field" style={{ cursor: "pointer" }}>
              <option value="seller">Vendedor</option>
              <option value="manager">Gestor da empresa</option>
              <option value="master">Simplifica (master)</option>
            </select>
            <select value={newCompany} onChange={(e) => setNewCompany(e.target.value)} className="field" style={{ cursor: "pointer" }}>
              <option value="">Sem empresa</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
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
            {/* Largura mínima para o nome e o e-mail caberem inteiros. Abaixo
                disso a tabela rola de lado em vez de espremer tudo. */}
            <div className="min-w-[860px]">
              <div className="grid items-center gap-3 border-b border-[rgba(120,150,210,.14)] px-[22px] py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted" style={{ gridTemplateColumns: "minmax(0,1.6fr) 128px 140px 158px 92px" }}>
                <span>Pessoa</span><span>Acesso</span><span>Papel</span><span>Empresa</span><span className="text-right">Ação</span>
              </div>
              {visiveis.map((r) => {
                const isSelf = r.uid === user?.uid;
                const staff = r.role !== "seller";
                return (
                  <div key={r.uid} className="grid items-center gap-3 border-b border-[rgba(120,150,210,.09)] px-[22px] py-3 last:border-0" style={{ gridTemplateColumns: "minmax(0,1.6fr) 128px 140px 158px 92px" }}>
                    {/* Nome e e-mail juntos: separados em colunas, o e-mail
                        virava "ad…" e não servia para identificar ninguém. */}
                    <span className="flex min-w-0 items-center gap-[11px]">
                      <span className="flex h-[32px] w-[32px] flex-none items-center justify-center rounded-full border border-[rgba(90,124,255,.35)] text-[10.5px] font-semibold text-cyan" style={{ background: "linear-gradient(135deg, rgba(74,110,220,.35), rgba(127,155,255,.14))" }}>{initials(r.name)}</span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[13.5px] font-semibold leading-tight text-foreground">
                          {r.name || "—"}{isSelf && <span className="ml-1.5 text-[11px] font-normal text-muted">(você)</span>}
                        </span>
                        <span className="truncate text-[12px] leading-tight text-muted" title={r.email}>{r.email}</span>
                      </span>
                    </span>

                    {/* Como esta pessoa tem acesso: pagando, contrato, cortesia — ou não tem. */}
                    <span><SeloPlano profile={r} /></span>

                    {/* Papel: o master não pode se rebaixar (o backend também barra). */}
                    <span>
                      {isSelf ? (
                        <span className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[10.5px] font-semibold" style={{ color: "#7f9bff", background: "rgba(127,155,255,.07)", border: "1px solid rgba(127,155,255,.25)" }}>
                          {ROLE_LABEL[r.role]}
                        </span>
                      ) : (
                        <select
                          value={r.role}
                          disabled={busyUid === r.uid}
                          onChange={(e) => patchUser(r.uid, { role: e.target.value as UserRole }, `${(r.name || r.email).split(" ")[0]} agora é ${ROLE_LABEL[e.target.value as UserRole].toLowerCase()}.`)}
                          className="w-full rounded-lg border px-2.5 py-1.5 text-[12px] font-medium disabled:opacity-50"
                          style={{ cursor: "pointer", background: "rgba(11,17,36,.55)", borderColor: staff ? "rgba(90,124,255,.4)" : "rgba(120,150,210,.16)", color: staff ? "#7f9bff" : "#cdd5e6" }}
                        >
                          <option value="seller">Vendedor</option>
                          <option value="manager">Gestor</option>
                          <option value="master">Simplifica</option>
                        </select>
                      )}
                    </span>

                    {/* Empresa: é isto que decide o que o gestor enxerga. */}
                    <span>
                      <select
                        value={r.companyId ?? ""}
                        disabled={busyUid === r.uid}
                        onChange={(e) => patchUser(r.uid, { companyId: e.target.value || null }, e.target.value ? "Pessoa vinculada à empresa." : "Pessoa desvinculada da empresa.")}
                        className="w-full rounded-lg border px-2.5 py-1.5 text-[12px] font-medium disabled:opacity-50"
                        style={{ cursor: "pointer", background: "rgba(11,17,36,.55)", borderColor: r.companyId ? "rgba(120,150,210,.16)" : "rgba(245,182,97,.35)", color: r.companyId ? "#cdd5e6" : "#f5b661" }}
                      >
                        <option value="">Sem empresa</option>
                        {companies.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </span>

                    {/* Encerrar / devolver acesso */}
                    <span className="text-right">
                      {isSelf ? (
                        <span className="text-[11px] text-muted">—</span>
                      ) : semAcesso(r) ? (
                        <button
                          onClick={() => devolverAcesso(r)}
                          disabled={busyUid === r.uid}
                          className="rounded-lg border border-[rgba(74,222,157,.35)] px-2.5 py-1.5 text-[11.5px] font-medium transition disabled:opacity-50"
                          style={{ color: "#4ade9d" }}
                          title="Devolver acesso como cortesia"
                        >
                          Devolver
                        </button>
                      ) : (
                        <button
                          onClick={() => encerrarAcesso(r)}
                          disabled={busyUid === r.uid}
                          className="rounded-lg border border-[rgba(244,114,106,.32)] px-2.5 py-1.5 text-[11.5px] font-medium text-danger transition hover:bg-[rgba(244,114,106,.08)] disabled:opacity-50"
                          title="Encerrar o acesso desta pessoa"
                        >
                          Encerrar
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
        O <strong className="text-foreground">gestor</strong> vê apenas os vendedores da empresa dele e pode testar a IA — não adiciona pessoas nem muda papéis. Só o <strong className="text-foreground">master</strong> faz isso. Você não pode remover o próprio acesso.
      </p>
    </div>
  );
}

export default function UsersPage() {
  return (
    <AuthGate allow={["master"]}>
      <AppShell>
        <Users />
      </AppShell>
    </AuthGate>
  );
}
