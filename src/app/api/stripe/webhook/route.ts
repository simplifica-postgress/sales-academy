import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { stripe, stripeMock } from "@/lib/server/stripeServer";
import {
  activateSubscription,
  emailKey,
  holdPendingSubscription,
} from "@/lib/server/subscriptionLink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook do Stripe — é por aqui que a assinatura NASCE e MUDA de estado.
 *
 * Fluxo do plano Vendedor: o botão "Assinar" abre o Payment Link com
 * ?client_reference_id={uid}. Quando o pagamento conclui, o Stripe chama
 * este endpoint com checkout.session.completed, e o client_reference_id
 * nos diz QUEM assinou. Renovações, falhas de cartão e cancelamentos chegam
 * como customer.subscription.updated/deleted.
 *
 * Segurança: a assinatura do evento é verificada com STRIPE_WEBHOOK_SECRET —
 * ninguém ativa plano forjando uma chamada HTTP.
 */
export async function POST(req: Request) {
  try {
    // No modo simulado não existe Stripe chamando ninguém.
    if (stripeMock()) {
      return NextResponse.json({ error: "Não encontrado." }, { status: 404 });
    }
    return await handleWebhook(req);
  } catch (err) {
    console.error("Erro não tratado no webhook do Stripe:", err);
    return NextResponse.json({ error: "Falha no servidor." }, { status: 500 });
  }
}

async function handleWebhook(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("STRIPE_WEBHOOK_SECRET ausente — webhook rejeitado.");
    return NextResponse.json({ error: "Webhook não configurado." }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });
  }

  // O corpo precisa ser o texto CRU: qualquer reserialização quebra a
  // verificação criptográfica da assinatura.
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(payload, signature, secret);
  } catch (err) {
    console.error("Assinatura de webhook inválida:", err);
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      // Só nos interessa checkout de assinatura (o Payment Link do plano).
      if (session.mode !== "subscription") break;

      const subId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription?.id ?? null;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null;

      // Busca o fim do período direto na assinatura recém-criada.
      let periodEnd: Timestamp | null = null;
      if (subId) {
        const sub = await stripe().subscriptions.retrieve(subId);
        const endSec = sub.items.data[0]?.current_period_end ?? null;
        if (endSec) periodEnd = Timestamp.fromMillis(endSec * 1000);
      }
      const dados = {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subId,
        periodEnd,
      };

      // CAMINHO 1 — assinou já logado (botão em Configurações): o uid veio
      // amarrado no link, então sabemos exatamente de quem é.
      const uid = session.client_reference_id;
      if (uid) {
        const userRef = adminDb.collection("users").doc(uid);
        if ((await userRef.get()).exists) {
          await activateSubscription(userRef, dados);
          break;
        }
        console.error(`Webhook: usuário ${uid} não existe (sessão ${session.id}).`);
      }

      // CAMINHO 2 — comprou pela landing page, sem conta ainda. Casamos pelo
      // e-mail do checkout: se a conta já existe, ativa; se não, a compra
      // fica guardada e é resgatada quando ela terminar o cadastro.
      const email = session.customer_details?.email ?? null;
      if (!email) {
        console.error(
          `Pagamento sem uid e sem e-mail (sessão ${session.id}) — conciliar na mão.`
        );
        break;
      }

      const existing = await adminDb
        .collection("users")
        .where("email", "==", emailKey(email))
        .limit(1)
        .get();

      if (!existing.empty) {
        await activateSubscription(existing.docs[0].ref, dados);
      } else {
        await holdPendingSubscription(email, dados);
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object;
      // Acha o dono pela assinatura (gravada no checkout).
      const match = await adminDb
        .collection("users")
        .where("stripeSubscriptionId", "==", sub.id)
        .limit(1)
        .get();
      if (match.empty) {
        console.error(`Webhook: nenhuma conta com a assinatura ${sub.id}.`);
        break;
      }

      let status: "active" | "past_due" | "canceling" | "canceled";
      if (event.type === "customer.subscription.deleted") status = "canceled";
      // "unpaid" NÃO é o mesmo que "past_due": é o Stripe DESISTINDO de
      // cobrar depois de esgotar as tentativas. Tratar como pagamento
      // pendente daria acesso vitalício a quem nunca mais vai pagar.
      else if (sub.status === "unpaid" || sub.status === "canceled") status = "canceled";
      else if (sub.cancel_at_period_end) status = "canceling";
      else if (sub.status === "past_due") status = "past_due";
      else status = "active";

      const endSec =
        sub.items.data[0]?.current_period_end ?? sub.cancel_at ?? null;

      await match.docs[0].ref.update({
        subscriptionStatus: status,
        subscriptionPeriodEnd: endSec ? Timestamp.fromMillis(endSec * 1000) : null,
        subscriptionUpdatedAt: FieldValue.serverTimestamp(),
      });
      break;
    }

    default:
      // Eventos que não acompanhamos: confirma o recebimento e segue.
      break;
  }

  return NextResponse.json({ received: true });
}
