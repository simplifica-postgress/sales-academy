"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useAdminData, type SellerRow } from "@/hooks/useAdminData";
import AuthGate from "@/components/AuthGate";
import AppHeader from "@/components/AppHeader";
import Card from "@/components/Card";
import Spinner from "@/components/Spinner";
import { LEVELS } from "@/lib/constants";
import { shortDate } from "@/lib/training";

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <p className="label-dash">{label}</p>
      <p className="mt-2 text-3xl font-bold text-white">{value}</p>
    </Card>
  );
}

function levelName(level: number): string {
  return LEVELS[Math.max(0, Math.min(level - 1, LEVELS.length - 1))].name;
}

function SellerTableRow({ row }: { row: SellerRow }) {
  const avg = row.progress?.averageScore ?? 0;
  const level = row.progress?.currentLevel ?? 1;
  return (
    <tr>
      <td className="py-3">
        <Link
          href={`/admin/${row.uid}`}
          className="font-medium text-foreground hover:text-cyan"
        >
          {row.profile.name || "—"}
        </Link>
        <p className="text-xs text-muted">{row.profile.company}</p>
      </td>
      <td className="py-3 text-center">
        <span
          className={`inline-block h-2.5 w-2.5 rounded-full ${
            row.sentToday ? "bg-cyan" : "bg-red-500/70"
          }`}
          title={row.sentToday ? "Enviou hoje" : "Não enviou hoje"}
        />
      </td>
      <td className="py-3 text-center text-foreground">
        {row.profile.currentDay || 0}
      </td>
      <td className="py-3 text-center text-foreground">
        {row.profile.progressPercent ?? 0}%
      </td>
      <td className="py-3 text-center font-bold text-white">
        {avg > 0 ? Math.round(avg) : "—"}
      </td>
      <td className="py-3 text-center">
        <span className="rounded-full border border-card-border bg-indicator px-2.5 py-0.5 text-xs text-cyan">
          {level} · {levelName(level)}
        </span>
      </td>
      <td className="py-3 text-right text-xs text-muted">
        {shortDate(row.lastUpload)}
      </td>
    </tr>
  );
}

function AdminPanel() {
  const { profile } = useAuth();
  const { sellers, loading, teamAverage, sentTodayCount } =
    useAdminData(profile?.role === "admin");

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <AppHeader />
        <div className="mb-6">
          <p className="label-dash">Painel do gestor</p>
          <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">
            Acompanhamento da equipe
          </h1>
        </div>

        {/* Indicadores gerais */}
        <div className="mb-4 grid gap-4 sm:grid-cols-3">
          <Stat label="Vendedores" value={sellers.length} />
          <Stat
            label="Enviaram hoje"
            value={`${sentTodayCount} / ${sellers.length}`}
          />
          <Stat label="Nota média da equipe" value={teamAverage || "—"} />
        </div>

        <Card title="Vendedores">
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : sellers.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Nenhum vendedor cadastrado ainda.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border text-left">
                    <th className="pb-3 font-medium text-muted">Vendedor</th>
                    <th className="pb-3 text-center font-medium text-muted">
                      Hoje
                    </th>
                    <th className="pb-3 text-center font-medium text-muted">
                      Dia
                    </th>
                    <th className="pb-3 text-center font-medium text-muted">
                      Progresso
                    </th>
                    <th className="pb-3 text-center font-medium text-muted">
                      Média
                    </th>
                    <th className="pb-3 text-center font-medium text-muted">
                      Nível
                    </th>
                    <th className="pb-3 text-right font-medium text-muted">
                      Último envio
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {sellers.map((row) => (
                    <SellerTableRow key={row.uid} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <p className="mt-4 text-center text-xs text-muted">
          Clique no nome de um vendedor para ver a evolução e o histórico
          completo de análises.
        </p>
      </div>
    </main>
  );
}

export default function AdminPage() {
  return (
    <AuthGate requireAdmin>
      <AdminPanel />
    </AuthGate>
  );
}
