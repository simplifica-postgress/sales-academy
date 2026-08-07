"use client";

import { useEffect, useState } from "react";
import type { Timestamp } from "firebase/firestore";
import { useAuth } from "@/contexts/AuthContext";
import AuthGate from "@/components/AuthGate";
import AppShell from "@/components/AppShell";
import { adminPost } from "@/lib/adminApi";
import { initials } from "@/lib/ui";
import {
  PLAN_LABELS,
  STATUS_LABELS,
  VENDEDOR_PRICE_LABEL,
  formatPeriodEnd,
  statusTone,
} from "@/lib/subscription";

const PAYMENT_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";
const SUPPORT_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "";

/** Cores dos selos de status (tema Aurora). */
const TONE_STYLE = {
  good: { color: "#4ade9d", background: "rgba(74,222,157,.1)", border: "1px solid rgba(74,222,157,.32)" },
  warn: { color: "#f5c163", background: "rgba(245,193,99,.1)", border: "1px solid rgba(245,193,99,.32)" },
  bad: { color: "#f4726a", background: "rgba(244,114,106,.1)", border: "1px solid rgba(244,114,106,.32)" },
} as const;

function waLink(text: string): string {
  return `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(text)}`;
}

function ConfigContent() {
  const { user, profile } = useAuth();

  // Fluxo de cancelamento em DUAS etapas: 1 = "tem certeza?",
  // 2 = digitar CANCELAR. O passo 0 é nenhum modal aberto.
  const [cancelStep, setCancelStep] = useState<0 | 1 | 2>(0);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Esc fecha os modais (sem perder o que já foi digitado por engano).
  useEffect(() => {
    if (cancelStep === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) setCancelStep(0);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cancelStep, busy]);

  if (!profile) return null;

  const plan = profile.plan ?? null;
  const status = profile.subscriptionStatus ?? null;
  const periodEnd = (profile.subscriptionPeriodEnd ?? null) as Timestamp | null;
  const hasSubscription = status === "active" || status === "past_due" || status === "canceling";
  const canCancel = status === "active" || status === "past_due";
  const roleLabel =
    profile.role === "master" ? "Simplifica" : profile.role === "manager" ? "Gestor" : "Vendedor";

  async function assinar() {
    setError("");
    setNotice("");
    if (PAYMENT_LINK) {
      // Link de pagamento do Stripe com o uid amarrado: é assim que o
      // webhook sabe QUEM pagou.
      const sep = PAYMENT_LINK.includes("?") ? "&" : "?";
      window.open(`${PAYMENT_LINK}${sep}client_reference_id=${user?.uid}`, "_blank");
      setNotice("Abrimos o pagamento em outra aba. Assim que ele for confirmado, sua assinatura aparece aqui.");
      return;
    }
    // Sem link configurado = ambiente de teste: ativa a assinatura simulada.
    setBusy(true);
    try {
      await adminPost("/api/subscription/mock", { action: "activate" });
      setNotice("Assinatura de teste ativada.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao ativar.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmarCancelamento() {
    setBusy(true);
    setError("");
    try {
      // O servidor confere a palavra de novo — aqui ela só libera o botão.
      const res = await adminPost<{ periodEnd: string }>("/api/subscription/cancel", {
        confirmation: confirmText.trim(),
      });
      setCancelStep(0);
      setConfirmText("");
      setNotice(
        `Assinatura cancelada. Seu acesso continua até ${new Date(res.periodEnd).toLocaleDateString("pt-BR", { day: "numeric", month: "long", year: "numeric" })}.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao cancelar.");
      setCancelStep(0);
      setConfirmText("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fade-up mx-auto max-w-[720px]">
      <div className="mb-6">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.015em] text-foreground">Configurações</h1>
        <p className="mt-2 text-[13.5px] leading-[1.6] text-muted">Sua conta, sua assinatura e o canal com o nosso time.</p>
      </div>

      {/* ---- Conta ---- */}
      <div className="dc-card mb-4 p-6">
        <div className="mono-label mb-4">Conta</div>
        <div className="flex items-center gap-3.5">
          <span className="flex h-[46px] w-[46px] flex-none items-center justify-center rounded-full border border-[rgba(90,124,255,.4)] text-[15px] font-semibold text-cyan" style={{ background: "linear-gradient(135deg, rgba(0,82,185,.35), rgba(127,155,255,.14))" }}>
            {initials(profile.name)}
          </span>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold text-foreground">{profile.name || "—"}</div>
            <div className="mt-0.5 truncate text-[12.5px] text-muted">{profile.email}</div>
          </div>
          <span className="mono-label ml-auto flex-none rounded-full border border-[rgba(120,150,210,.2)] px-3 py-1" style={{ fontSize: 10 }}>
            {roleLabel}
          </span>
        </div>
      </div>

      {/* ---- Assinatura ---- */}
      <div className="dc-card mb-4 p-6">
        <div className="mono-label mb-4">Assinatura</div>

        {notice && (
          <p className="mb-4 rounded-[10px] border border-[rgba(74,222,157,.3)] bg-[rgba(74,222,157,.07)] px-3.5 py-[11px] text-[13px]" style={{ color: "#4ade9d" }}>
            {notice}
          </p>
        )}
        {error && (
          <p className="mb-4 rounded-[10px] border border-[rgba(244,114,106,.28)] bg-[rgba(244,114,106,.08)] px-3.5 py-[11px] text-[13px] text-danger">{error}</p>
        )}

        {plan === "enterprise" ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-[17px] font-semibold text-foreground">{PLAN_LABELS.enterprise}</div>
              <span className="rounded-full px-3 py-1 text-[11.5px] font-bold" style={TONE_STYLE.good}>Ativa</span>
            </div>
            <p className="mt-2.5 text-[13px] leading-[1.6] text-muted">
              Seu plano é gerenciado direto com o nosso comercial — alterações, upgrades e cancelamento passam por ele.
            </p>
            {SUPPORT_WHATSAPP && (
              <a href={waLink("Olá! Sou cliente Enterprise da Sales Academy e preciso falar sobre o meu plano.")} target="_blank" rel="noreferrer" className="btn-primary mt-4 inline-block rounded-[11px] px-5 py-[11px] text-sm font-semibold">
                Falar com o comercial
              </a>
            )}
          </>
        ) : hasSubscription && status ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-[17px] font-semibold text-foreground">{PLAN_LABELS.vendedor}</div>
              <span className="rounded-full px-3 py-1 text-[11.5px] font-bold" style={TONE_STYLE[statusTone(status)]}>
                {STATUS_LABELS[status]}
              </span>
            </div>
            <div className="mt-3 grid gap-2 text-[13px] text-muted">
              <div className="flex justify-between border-b border-[rgba(120,150,210,.1)] pb-2">
                <span>Valor</span><span className="font-semibold text-foreground">{VENDEDOR_PRICE_LABEL}</span>
              </div>
              <div className="flex justify-between">
                <span>{status === "canceling" ? "Acesso até" : "Próxima renovação"}</span>
                <span className="font-semibold text-foreground">{formatPeriodEnd(periodEnd)}</span>
              </div>
            </div>

            {status === "past_due" && (
              <p className="mt-3 rounded-[10px] border border-[rgba(245,193,99,.3)] bg-[rgba(245,193,99,.07)] px-3.5 py-[11px] text-[12.5px]" style={{ color: "#f5c163" }}>
                O último pagamento não foi aprovado. Verifique o cartão — vamos tentar de novo automaticamente.
              </p>
            )}

            <div className="mt-5 flex flex-wrap gap-2.5">
              {SUPPORT_WHATSAPP && (
                <a href={waLink("Olá! Uso a Sales Academy e quero aumentar o meu plano para a minha equipe (Enterprise).")} target="_blank" rel="noreferrer" className="rounded-[11px] border border-[rgba(90,124,255,.45)] px-4 py-[10px] text-[13px] font-semibold text-cyan transition hover:bg-[rgba(90,124,255,.08)]">
                  Aumentar plano (falar com o comercial)
                </a>
              )}
              {canCancel && (
                <button onClick={() => { setError(""); setNotice(""); setCancelStep(1); }} className="rounded-[11px] border border-[rgba(244,114,106,.35)] px-4 py-[10px] text-[13px] font-semibold text-danger transition hover:bg-[rgba(244,114,106,.08)]">
                  Cancelar assinatura
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-[17px] font-semibold text-foreground">{PLAN_LABELS.vendedor}</div>
              <span className="rounded-full px-3 py-1 text-[11.5px] font-bold" style={{ color: "#79839c", background: "rgba(120,150,210,.1)", border: "1px solid rgba(120,150,210,.22)" }}>
                {status === "canceled" ? "Encerrada" : "Sem assinatura"}
              </span>
            </div>
            <p className="mt-2.5 text-[13px] leading-[1.6] text-muted">
              Treine com análises de IA ilimitadas, missões diárias e acesso a todas as aulas por <strong className="text-foreground">{VENDEDOR_PRICE_LABEL}</strong>.
            </p>
            <button onClick={assinar} disabled={busy} className="btn-primary mt-4 rounded-[11px] px-5 py-[11px] text-sm font-semibold disabled:opacity-60">
              {busy ? "Ativando…" : PAYMENT_LINK ? `Assinar — ${VENDEDOR_PRICE_LABEL}` : "Ativar assinatura de teste"}
            </button>
            {!PAYMENT_LINK && (
              <p className="mt-2 text-[11.5px] text-muted">Ambiente de teste: sem cobrança real (link do Stripe ainda não configurado).</p>
            )}
          </>
        )}
      </div>

      {/* ---- Suporte ---- */}
      <div className="dc-card p-6">
        <div className="mono-label mb-3">Suporte</div>
        <p className="text-[13px] leading-[1.6] text-muted">
          Dúvidas, problemas com pagamento ou quer levar a Sales Academy para toda a sua equipe? Nosso time responde rápido.
        </p>
        {SUPPORT_WHATSAPP ? (
          <a href={waLink("Olá! Preciso de ajuda com a Sales Academy.")} target="_blank" rel="noreferrer" className="mt-3.5 inline-flex items-center gap-2 rounded-[11px] border border-[rgba(120,150,210,.2)] bg-card-alt px-4 py-[10px] text-[13px] font-semibold text-foreground transition hover:border-[rgba(90,124,255,.5)]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 12a9 9 0 0 1-13.2 8L3 21l1-4.6A9 9 0 1 1 21 12z" /></svg>
            Chamar no WhatsApp
          </a>
        ) : (
          <p className="mt-3 text-[11.5px] text-muted">
            (Configure NEXT_PUBLIC_SUPPORT_WHATSAPP no .env para ativar o botão do WhatsApp.)
          </p>
        )}
      </div>

      {/* ---- Modal 1: tem certeza? ---- */}
      {cancelStep === 1 && (
        <Modal onClose={() => setCancelStep(0)}>
          <div className="text-[17px] font-semibold text-foreground">Cancelar sua assinatura?</div>
          <p className="mt-2.5 text-[13px] leading-[1.65] text-muted">
            Você vai perder o acesso às análises de IA, às missões e às aulas quando o período pago terminar
            {periodEnd ? <> (em <strong className="text-foreground">{formatPeriodEnd(periodEnd)}</strong>)</> : null}.
            Até lá, tudo continua funcionando normalmente.
          </p>
          <div className="mt-5 flex flex-col gap-2.5">
            <button onClick={() => setCancelStep(0)} className="btn-primary w-full rounded-[11px] px-5 py-[12px] text-sm font-semibold">
              Manter minha assinatura
            </button>
            <button onClick={() => setCancelStep(2)} className="w-full rounded-[11px] border border-[rgba(244,114,106,.35)] px-5 py-[12px] text-[13px] font-semibold text-danger transition hover:bg-[rgba(244,114,106,.08)]">
              Tenho certeza, quero cancelar
            </button>
          </div>
        </Modal>
      )}

      {/* ---- Modal 2: digitar CANCELAR ---- */}
      {cancelStep === 2 && (
        <Modal onClose={() => { if (!busy) { setCancelStep(0); setConfirmText(""); } }}>
          <div className="text-[17px] font-semibold text-foreground">Última confirmação</div>
          <p className="mt-2.5 text-[13px] leading-[1.65] text-muted">
            Para encerrar de vez, digite <strong className="text-danger">CANCELAR</strong> no campo abaixo. Essa ação desliga a renovação da sua assinatura.
          </p>
          <input
            autoFocus
            value={confirmText}
            // Sobe para maiúsculas de verdade: o campo já EXIBE em maiúsculas,
            // então digitar "cancelar" e ver o botão travado seria um mistério.
            onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
            placeholder="Digite CANCELAR"
            className="field mt-4"
            style={{ textTransform: "uppercase", letterSpacing: "0.08em" }}
          />
          <div className="mt-4 flex flex-col gap-2.5">
            <button
              onClick={confirmarCancelamento}
              disabled={confirmText.trim() !== "CANCELAR" || busy}
              className="w-full rounded-[11px] px-5 py-[12px] text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40"
              style={{ background: "linear-gradient(90deg,#e05a50,#f4726a)" }}
            >
              {busy ? "Encerrando…" : "Encerrar assinatura"}
            </button>
            <button onClick={() => { if (!busy) { setCancelStep(0); setConfirmText(""); } }} className="w-full rounded-[11px] border border-[rgba(120,150,210,.2)] px-5 py-[12px] text-[13px] font-medium text-muted transition hover:text-foreground">
              Voltar
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/** Modal padrão: escurece o fundo e centraliza o cartão. */
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5"
      style={{ background: "rgba(0,4,18,.72)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div className="dc-card w-full max-w-[420px] p-6" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export default function ConfiguracoesPage() {
  return (
    <AuthGate>
      <AppShell>
        <ConfigContent />
      </AppShell>
    </AuthGate>
  );
}
