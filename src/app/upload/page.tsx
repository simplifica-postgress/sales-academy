"use client";

import Link from "next/link";
import AuthGate from "@/components/AuthGate";
import AppHeader from "@/components/AppHeader";
import Card from "@/components/Card";

function UploadPlaceholder() {
  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-3xl">
        <AppHeader />
        <Card title="Enviar atendimento">
          <p className="text-sm leading-relaxed text-muted">
            O envio de áudio e vídeo com análise por IA está em construção
            (próxima fase do desenvolvimento). Em breve você vai enviar seu
            atendimento por aqui e receber a devolutiva completa em minutos.
          </p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm font-semibold text-cyan transition hover:text-cyan-light"
          >
            ← Voltar ao dashboard
          </Link>
        </Card>
      </div>
    </main>
  );
}

export default function UploadPage() {
  return (
    <AuthGate>
      <UploadPlaceholder />
    </AuthGate>
  );
}
