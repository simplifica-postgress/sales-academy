"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { adminPost } from "@/lib/adminApi";
import Spinner from "@/components/Spinner";

const PAYMENT_LINK = process.env.NEXT_PUBLIC_STRIPE_PAYMENT_LINK ?? "";

interface StatusResposta {
  paid: boolean;
  profileCompleted: boolean;
  role: string;
}

/**
 * Ponte entre a landing page e o pagamento.
 *
 * Quem clica em "garantir minha cadeira" cai aqui. O caminho é sempre o mesmo:
 *   1. não está logado  -> manda para o login e volta para cá depois;
 *   2. já tem acesso    -> entra no app (não cobra de novo);
 *   3. não tem          -> segue para o pagamento no Stripe, com o uid
 *                          amarrado no link (client_reference_id).
 *
 * É o uid amarrado que faz o webhook saber DE QUEM é a assinatura — sem ele,
 * sobraria adivinhar pelo e-mail.
 */
function CheckoutFluxo() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [mensagem, setMensagem] = useState("Verificando sua conta…");
  const [erro, setErro] = useState("");
  const jaRodou = useRef(false);

  // Volta do Stripe: o webhook pode levar um instante para gravar, então
  // consultamos algumas vezes antes de desistir.
  const voltandoDoPagamento = params.get("pago") === "1";

  useEffect(() => {
    if (loading || jaRodou.current) return;

    // Sem sessão: login primeiro, com retorno para cá.
    if (!user) {
      const destino = voltandoDoPagamento ? "/checkout?pago=1" : "/checkout";
      router.replace(`/login?next=${encodeURIComponent(destino)}`);
      return;
    }

    jaRodou.current = true;

    (async () => {
      try {
        let status = await adminPost<StatusResposta>("/api/subscription/status", {});

        // Acabou de pagar: dá tempo ao webhook (até ~10s).
        if (!status.paid && voltandoDoPagamento) {
          setMensagem("Confirmando seu pagamento…");
          for (let i = 0; i < 5 && !status.paid; i++) {
            await new Promise((r) => setTimeout(r, 2000));
            status = await adminPost<StatusResposta>("/api/subscription/status", {});
          }
        }

        if (status.paid) {
          setMensagem("Tudo certo! Entrando…");
          if (!status.profileCompleted) router.replace("/cadastro");
          else if (status.role === "manager" || status.role === "master") router.replace("/admin");
          else router.replace("/dashboard");
          return;
        }

        if (voltandoDoPagamento) {
          // Pagou mas ainda não confirmou (Pix/boleto, ou webhook atrasado).
          setErro(
            "Ainda não recebemos a confirmação do seu pagamento. Se você acabou de pagar, aguarde alguns minutos e atualize esta página. Seu acesso é liberado automaticamente."
          );
          return;
        }

        if (!PAYMENT_LINK) {
          setErro("O link de pagamento ainda não foi configurado. Fale com o suporte.");
          return;
        }

        // Segue para o Stripe com o uid amarrado.
        setMensagem("Levando você ao pagamento seguro…");
        const sep = PAYMENT_LINK.includes("?") ? "&" : "?";
        window.location.href = `${PAYMENT_LINK}${sep}client_reference_id=${user.uid}`;
      } catch (err) {
        setErro(err instanceof Error ? err.message : "Não foi possível verificar sua conta.");
      }
    })();
  }, [loading, user, router, voltandoDoPagamento]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 text-center">
      <Image src="/logo.png" alt="Simplifica" width={150} height={40} style={{ width: 150, height: "auto" }} priority />
      <div className="mono-label mt-2.5" style={{ letterSpacing: "0.22em", fontSize: 10 }}>
        Sala do Agendamento
      </div>

      {erro ? (
        <div className="mt-7 w-full max-w-[440px]">
          <p className="rounded-[10px] border border-[rgba(244,114,106,.28)] bg-[rgba(244,114,106,.08)] px-4 py-3.5 text-[13px] leading-[1.6] text-danger">
            {erro}
          </p>
          <div className="mt-4 flex flex-col gap-2.5">
            <button
              onClick={() => window.location.reload()}
              className="btn-primary w-full rounded-[11px] px-5 py-[12px] text-sm font-semibold"
            >
              Verificar de novo
            </button>
            <button
              onClick={() => router.push("/dashboard")}
              className="w-full rounded-[11px] border border-[rgba(120,150,210,.2)] px-5 py-[12px] text-[13px] font-medium text-muted transition hover:text-foreground"
            >
              Ir para a plataforma
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-8">
            <Spinner />
          </div>
          <p className="mt-4 text-[13.5px] text-muted">{mensagem}</p>
        </>
      )}
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <CheckoutFluxo />
    </Suspense>
  );
}
