import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/server/adminAuth";
import { runRetentionCleanup } from "@/lib/server/recordings";
import { RETENTION_DAYS } from "@/lib/constants";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Limpeza por retenção: apaga gravações mais antigas que RETENTION_DAYS,
 * preservando todas as análises.
 *
 * Autorização (uma das duas):
 *  - Gestor logado (botão "Executar agora" no painel), ou
 *  - Header `x-cron-secret` igual a CRON_SECRET (para agendador automático,
 *    ex.: Cloud Scheduler chamando este endpoint todo dia).
 */
export async function POST(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const providedSecret = req.headers.get("x-cron-secret");
  const isCron = Boolean(
    cronSecret && providedSecret && providedSecret === cronSecret
  );

  if (!isCron) {
    try {
      await requireAdmin(req);
    } catch {
      return NextResponse.json(
        { error: "Acesso restrito a gestores." },
        { status: 403 }
      );
    }
  }

  try {
    const result = await runRetentionCleanup(RETENTION_DAYS);
    console.log("Retenção executada:", result);
    return NextResponse.json({ ok: true, ...result, triggeredBy: isCron ? "cron" : "admin" });
  } catch (err) {
    console.error("Erro na retenção:", err);
    return NextResponse.json(
      { error: "Falha ao executar a limpeza." },
      { status: 500 }
    );
  }
}

/** Prévia: quantas gravações seriam apagadas agora (não apaga nada). */
export async function GET(req: Request) {
  try {
    await requireAdmin(req);
  } catch {
    return NextResponse.json(
      { error: "Acesso restrito a gestores." },
      { status: 403 }
    );
  }
  return NextResponse.json({ retentionDays: RETENTION_DAYS });
}
