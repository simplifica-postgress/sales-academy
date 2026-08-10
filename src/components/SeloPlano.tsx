"use client";

import { accessReason, type AccessInput } from "@/lib/subscription";

/**
 * Diz de relance como aquela pessoa tem acesso: pagando, por contrato,
 * por cortesia — ou se não tem. É o que responde "quem está pagando?" sem
 * precisar abrir o Stripe.
 */
const ESTILOS = {
  verde: { color: "#4ade9d", background: "rgba(74,222,157,.1)", border: "1px solid rgba(74,222,157,.3)" },
  azul: { color: "#7f9bff", background: "rgba(127,155,255,.1)", border: "1px solid rgba(127,155,255,.32)" },
  cinza: { color: "#79839c", background: "rgba(120,150,210,.09)", border: "1px solid rgba(120,150,210,.2)" },
  amarelo: { color: "#f5c163", background: "rgba(245,193,99,.1)", border: "1px solid rgba(245,193,99,.3)" },
  vermelho: { color: "#f4726a", background: "rgba(244,114,106,.1)", border: "1px solid rgba(244,114,106,.3)" },
} as const;

export default function SeloPlano({ profile }: { profile: AccessInput | null }) {
  const motivo = accessReason(profile);

  const { texto, estilo } = (() => {
    switch (motivo) {
      case "master":
        return { texto: "Simplifica", estilo: ESTILOS.azul };
      case "gestor":
        return { texto: "Gestor", estilo: ESTILOS.azul };
      case "empresarial":
        return { texto: "Empresarial", estilo: ESTILOS.azul };
      case "cortesia":
        return { texto: "Cortesia", estilo: ESTILOS.cinza };
      case "assinatura":
        return profile?.subscriptionStatus === "past_due"
          ? { texto: "Pgto. pendente", estilo: ESTILOS.amarelo }
          : { texto: "Pagante", estilo: ESTILOS.verde };
      case "periodo-final":
        return { texto: "Cancelando", estilo: ESTILOS.amarelo };
      default:
        return { texto: "Sem assinatura", estilo: ESTILOS.vermelho };
    }
  })();

  return (
    <span
      className="inline-block flex-none whitespace-nowrap rounded-full px-2.5 py-[3px] text-[10.5px] font-bold"
      style={estilo}
      title={`Acesso por: ${motivo}`}
    >
      {texto}
    </span>
  );
}
