import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Diagnóstico do servidor — NÃO expõe segredos, só se as variáveis existem
 * e se o Firebase Admin inicializa. Serve para conferir um deploy sem
 * precisar dos logs. Ex.: GET /api/health
 */
export async function GET() {
  const env = process.env;

  // Tenta inicializar o Admin de verdade (é o que falha em "Sessão inválida").
  let adminReady = false;
  let adminError: string | null = null;
  try {
    const { adminAuth } = await import("@/lib/server/firebaseAdmin");
    // Acessar um método força a inicialização preguiçosa.
    if (typeof adminAuth.verifyIdToken === "function") adminReady = true;
  } catch (err) {
    adminError = err instanceof Error ? err.message : "erro desconhecido";
  }

  return NextResponse.json({
    ok: adminReady,
    // Firebase do cliente (embutido no build)
    publicFirebase: {
      projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? null,
      hasApiKey: Boolean(env.NEXT_PUBLIC_FIREBASE_API_KEY),
      authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? null,
      storageBucket: env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? null,
    },
    // Backend (segredos — só reportamos se EXISTEM, nunca o valor)
    adminReady,
    adminError,
    adminEnv: {
      hasProjectId: Boolean(env.FIREBASE_ADMIN_PROJECT_ID),
      hasClientEmail: Boolean(env.FIREBASE_ADMIN_CLIENT_EMAIL),
      hasPrivateKey: Boolean(env.FIREBASE_ADMIN_PRIVATE_KEY),
      privateKeyLength: env.FIREBASE_ADMIN_PRIVATE_KEY?.length ?? 0,
    },
    // IA
    hasOpenAiKey: Boolean(env.OPENAI_API_KEY),
    aiMock: env.AI_MOCK === "true",
    retentionDays: Number(env.NEXT_PUBLIC_RETENTION_DAYS ?? 60),
  });
}
