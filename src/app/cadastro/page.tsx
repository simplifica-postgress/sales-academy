"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AuthGate from "@/components/AuthGate";
import { completeProfile } from "@/lib/user";
import { ATTENDANCE_TYPES } from "@/lib/constants";
import type { AttendanceType } from "@/lib/types";

const EXPERIENCE_OPTIONS = [
  "Menos de 1 ano",
  "1 a 3 anos",
  "3 a 5 anos",
  "5 a 10 anos",
  "Mais de 10 anos",
];

const inputClass =
  "w-full rounded-lg border border-card-border bg-card-alt px-3 py-2.5 text-sm text-foreground placeholder-muted/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";

function ProfileForm() {
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();

  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [salesRole, setSalesRole] = useState("");
  const [experience, setExperience] = useState("");
  const [attendanceTypes, setAttendanceTypes] = useState<AttendanceType[]>([]);
  const [mainDifficulty, setMainDifficulty] = useState("");
  const [goal, setGoal] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (profile?.name) setName(profile.name);
  }, [profile?.name]);

  function toggleType(type: AttendanceType) {
    setAttendanceTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (attendanceTypes.length === 0) {
      setError("Selecione pelo menos um tipo de atendimento.");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await completeProfile(
        user.uid,
        user.email ?? "",
        {
          name: name.trim(),
          company: company.trim(),
          salesRole: salesRole.trim(),
          experience,
          attendanceTypes,
          mainDifficulty: mainDifficulty.trim(),
          goal: goal.trim(),
        },
        { isNew: !profile }
      );
      await refreshProfile();
      router.replace("/dashboard");
    } catch (err) {
      console.error(err);
      setError("Não foi possível salvar. Tente novamente.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-8">
          <p className="text-xl font-bold lowercase tracking-tight text-white">
            simplifica<span className="text-cyan">.</span>
          </p>
          <h1 className="mt-4 text-2xl font-bold text-white">
            Vamos montar o seu perfil
          </h1>
          <p className="mt-2 text-sm text-muted">
            Essas informações personalizam a análise da IA para o seu contexto
            de vendas. Leva menos de 2 minutos.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-5 rounded-2xl border border-card-border bg-card p-6 sm:p-8"
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="label-dash mb-1.5 block">
                Nome
              </label>
              <input
                id="name"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
                placeholder="Seu nome completo"
              />
            </div>
            <div>
              <label htmlFor="company" className="label-dash mb-1.5 block">
                Empresa
              </label>
              <input
                id="company"
                type="text"
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className={inputClass}
                placeholder="Onde você trabalha"
              />
            </div>
            <div>
              <label htmlFor="salesRole" className="label-dash mb-1.5 block">
                Cargo / função
              </label>
              <input
                id="salesRole"
                type="text"
                required
                value={salesRole}
                onChange={(e) => setSalesRole(e.target.value)}
                className={inputClass}
                placeholder="Ex.: Vendedor, SDR, Closer"
              />
            </div>
            <div>
              <label htmlFor="experience" className="label-dash mb-1.5 block">
                Experiência em vendas
              </label>
              <select
                id="experience"
                required
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
                className={inputClass}
              >
                <option value="" disabled>
                  Selecione…
                </option>
                {EXPERIENCE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <p className="label-dash mb-2">Tipos de atendimento que você faz</p>
            <div className="flex flex-wrap gap-2">
              {ATTENDANCE_TYPES.map(({ value, label }) => {
                const active = attendanceTypes.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleType(value)}
                    className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                      active
                        ? "border-primary bg-primary/20 text-cyan"
                        : "border-card-border bg-card-alt text-muted hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label htmlFor="difficulty" className="label-dash mb-1.5 block">
              Principal dificuldade comercial
            </label>
            <textarea
              id="difficulty"
              required
              rows={3}
              value={mainDifficulty}
              onChange={(e) => setMainDifficulty(e.target.value)}
              className={inputClass}
              placeholder="Ex.: leads que somem depois do preço, dificuldade em contornar 'vou pensar'…"
            />
          </div>

          <div>
            <label htmlFor="goal" className="label-dash mb-1.5 block">
              Objetivo no treinamento
            </label>
            <textarea
              id="goal"
              required
              rows={3}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              className={inputClass}
              placeholder="Ex.: fechar mais reuniões, melhorar meu diagnóstico, vender com mais segurança…"
            />
          </div>

          {error && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-gradient-to-r from-blue-dark to-primary px-4 py-3 text-sm font-semibold text-white transition hover:from-primary hover:to-cyan disabled:opacity-50"
          >
            {submitting ? "Salvando…" : "Começar meu treinamento de 30 dias"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function CadastroPage() {
  return (
    <AuthGate>
      <ProfileForm />
    </AuthGate>
  );
}
