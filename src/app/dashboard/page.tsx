"use client";

import { useAuth } from "@/contexts/AuthContext";
import AuthGate from "@/components/AuthGate";
import Logo from "@/components/Logo";

function Dashboard() {
  const { profile, signOut } = useAuth();
  const firstName = profile?.name?.split(" ")[0] ?? "";

  return (
    <main className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-8 flex items-center justify-between">
          <div>
            <Logo width={150} />
            <p className="label-dash mt-2">Sales Academy</p>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="rounded-lg border border-card-border bg-card-alt px-4 py-2 text-sm font-medium text-muted transition hover:border-primary/50 hover:text-foreground"
          >
            Sair
          </button>
        </header>

        <div className="rounded-2xl border border-card-border bg-card p-8 text-center">
          <h1 className="text-2xl font-bold text-white">
            Olá, {firstName}! 👋
          </h1>
          <p className="mt-3 text-muted">
            Seu perfil está pronto. O dashboard completo — barra de progresso,
            envio do dia e análises — chega na próxima fase do desenvolvimento.
          </p>
        </div>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <Dashboard />
    </AuthGate>
  );
}
