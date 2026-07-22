import { NextResponse } from "next/server";
import { AuthError, requireMaster } from "@/lib/server/adminAuth";
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
      await requireMaster(req);
    } catch (err) {
      // Preserva o status real: 401 = sem token/sessão inválida, 403 = papel
      // errado. Achatar tudo em 403 escondia a causa e confundia o diagnóstico.
      const e = err as AuthError;
      return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
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
    await requireMaster(req);
  } catch (err) {
    const e = err as AuthError;
    return NextResponse.json({ error: e.message }, { status: e.status ?? 401 });
  }
  return NextResponse.json({ retentionDays: RETENTION_DAYS });
}
