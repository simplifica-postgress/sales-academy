"use client";

import { useRouter } from "next/navigation";
import { VENDEDOR_PRICE_LABEL } from "@/lib/subscription";

/**
 * Tela que o vendedor sem assinatura vê no lugar do app.
 *
 * Não é uma porta na cara: explica em uma frase, mostra o preço e leva ao
 * pagamento em um clique. Quem cancelou ou teve o cartão recusado cai aqui,
 * e o caminho de volta é curto.
 */
export default function AssinaturaNecessaria({
  nome,
  encerrada,
}: {
  nome?: string;
  encerrada?: boolean;
}) {
  const router = useRouter();

  return (
    <div className="fade-up mx-auto max-w-[520px] py-6">
      <div className="dc-card px-7 py-9 text-center">
        <span
          className="mx-auto flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-[rgba(90,124,255,.35)] text-cyan"
          style={{ background: "rgba(90,124,255,.1)" }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <rect x="4" y="10" width="16" height="10" rx="2.5" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
        </span>

        <h1 className="mt-5 text-[21px] font-semibold leading-tight tracking-[-0.015em] text-foreground">
          {nome ? `${nome}, sua assinatura está inativa` : "Sua assinatura está inativa"}
        </h1>

        <p className="mx-auto mt-3 max-w-[400px] text-[13.5px] leading-[1.65] text-muted">
          {encerrada
            ? "Seu período de acesso terminou. Reative para voltar a enviar atendimentos e receber as análises da IA."
            : "Para enviar atendimentos e receber as análises da IA, ative sua assinatura da Sala do Agendamento."}
        </p>

        <div className="mx-auto mt-5 flex max-w-[330px] flex-col gap-2.5">
          <button
            onClick={() => router.push("/checkout")}
            className="btn-primary w-full rounded-[11px] px-5 py-[13px] text-sm font-semibold"
          >
            Assinar — {VENDEDOR_PRICE_LABEL}
          </button>
          <button
            onClick={() => router.push("/configuracoes")}
            className="w-full rounded-[11px] border border-[rgba(120,150,210,.2)] px-5 py-[12px] text-[13px] font-medium text-muted transition hover:text-foreground"
          >
            Ver minha assinatura
          </button>
        </div>

        <p className="mt-5 text-[11.5px] leading-[1.6] text-muted">
          Já pagou e ainda aparece assim? A liberação pode levar alguns minutos.
          <br />
          Atualize a página ou fale com o suporte.
        </p>
      </div>
    </div>
  );
}
