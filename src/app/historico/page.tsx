"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useSellerData } from "@/hooks/useSellerData";
import AuthGate from "@/components/AuthGate";
import AppHeader from "@/components/AppHeader";
import Card from "@/components/Card";
import Spinner from "@/components/Spinner";
import { ATTENDANCE_TYPES } from "@/lib/constants";
import { shortDate } from "@/lib/training";
import type { UploadStatus } from "@/lib/types";

const STATUS_LABELS: Record<UploadStatus, { label: string; className: string }> =
  {
    pending: { label: "Na fila", className: "bg-indicator text-muted" },
    processing: { label: "Processando", className: "bg-primary/15 text-primary" },
    done: { label: "Concluído", className: "bg-cyan/15 text-cyan" },
    error: { label: "Erro", className: "bg-red-500/15 text-red-400" },
  };

function attendanceLabel(value: string): string {
  return ATTENDANCE_TYPES.find((t) => t.value === value)?.label ?? value;
}

function History() {
  const { user } = useAuth();
  const { uploads, analyses, loading } = useSellerData(user?.uid);
  const analysisByUpload = new Map(analyses.map((a) => [a.uploadId, a]));

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-4xl">
        <AppHeader />
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Histórico de envios</h1>
          <p className="mt-1 text-sm text-muted">
            Todos os seus atendimentos enviados e suas análises.
          </p>
        </div>

        <Card>
          {loading ? (
            <div className="flex justify-center py-8">
              <Spinner />
            </div>
          ) : uploads.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              Você ainda não enviou nenhum atendimento.{" "}
              <Link href="/upload" className="text-cyan hover:text-cyan-light">
                Enviar o primeiro
              </Link>
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-card-border text-left">
                    <th className="pb-3 font-medium text-muted">Data</th>
                    <th className="pb-3 font-medium text-muted">Tipo</th>
                    <th className="pb-3 font-medium text-muted">Atendimento</th>
                    <th className="pb-3 text-right font-medium text-muted">
                      Nota
                    </th>
                    <th className="pb-3 text-right font-medium text-muted">
                      Status
                    </th>
                    <th className="pb-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {uploads.map((u) => {
                    const analysis = analysisByUpload.get(u.id);
                    const status = STATUS_LABELS[u.status];
                    return (
                      <tr key={u.id}>
                        <td className="py-3 text-foreground">
                          {shortDate(u.createdAt)}
                        </td>
                        <td className="py-3 text-foreground">
                          {u.fileType === "video" ? "Vídeo" : "Áudio"}
                        </td>
                        <td className="py-3 text-foreground">
                          {attendanceLabel(u.attendanceType)}
                        </td>
                        <td className="py-3 text-right font-bold text-white">
                          {analysis ? Math.round(analysis.generalScore) : "—"}
                        </td>
                        <td className="py-3 text-right">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          {analysis ? (
                            <Link
                              href={`/analise/${analysis.id}`}
                              className="text-xs font-semibold text-cyan hover:text-cyan-light"
                            >
                              Ver análise
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="mt-4 flex justify-center">
          <Link
            href="/dashboard"
            className="text-sm font-semibold text-cyan transition hover:text-cyan-light"
          >
            ← Voltar ao dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function HistoryPage() {
  return (
    <AuthGate>
      <History />
    </AuthGate>
  );
}
