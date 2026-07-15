"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import AuthGate from "@/components/AuthGate";
import { completeProfile } from "@/lib/user";
import { ATTENDANCE_TYPES } from "@/lib/constants";
import type { AttendanceType } from "@/lib/types";

const EXPERIENCE_OPTIONS = ["Menos de 1 ano", "1 a 3 anos", "3 a 5 anos", "5 a 10 anos", "Mais de 10 anos"];

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
    setAttendanceTypes((prev) => (prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]));
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

  const labelCls = "mono-label mb-[7px] block";
  const labelStyle = { letterSpacing: "0.14em" };

  return (
    <main className="fade-up min-h-screen px-[18px] pb-[120px] pt-12">
      <div className="mx-auto w-full max-w-[620px]">
        <Image src="/logo.png" alt="Simplifica" width={150} height={40} style={{ width: 150, height: "auto" }} priority />
        <h1 className="mt-[22px] text-[25px] font-semibold leading-tight tracking-[-0.015em] text-foreground">
          Vamos montar o seu perfil
        </h1>
        <p className="mb-[26px] mt-[9px] text-[13.5px] leading-relaxed text-muted">
          Essas informações personalizam a análise da IA para o seu contexto de vendas. Leva menos de 2 minutos.
        </p>

        <form onSubmit={handleSubmit} className="rounded-[18px] bg-card px-7 py-[30px]" style={{ border: "1px solid rgba(0,45,115,.6)", boxShadow: "0 24px 60px rgba(0,2,12,.5)" }}>
          <div className="grid gap-[18px] sm:grid-cols-2">
            <div>
              <label htmlFor="name" className={labelCls} style={labelStyle}>Nome</label>
              <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder="Seu nome completo" />
            </div>
            <div>
              <label htmlFor="company" className={labelCls} style={labelStyle}>Empresa</label>
              <input id="company" type="text" required value={company} onChange={(e) => setCompany(e.target.value)} className="field" placeholder="Onde você trabalha" />
            </div>
            <div>
              <label htmlFor="salesRole" className={labelCls} style={labelStyle}>Cargo / função</label>
              <input id="salesRole" type="text" required value={salesRole} onChange={(e) => setSalesRole(e.target.value)} className="field" placeholder="Ex.: Vendedor, SDR, Closer" />
            </div>
            <div>
              <label htmlFor="experience" className={labelCls} style={labelStyle}>Experiência em vendas</label>
              <select id="experience" required value={experience} onChange={(e) => setExperience(e.target.value)} className="field" style={{ appearance: "none", cursor: "pointer" }}>
                <option value="" disabled>Selecione…</option>
                {EXPERIENCE_OPTIONS.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
              </select>
            </div>
          </div>

          <div className="mt-[22px]">
            <div className={labelCls} style={labelStyle}>Tipos de atendimento que você faz</div>
            <div className="flex flex-wrap gap-2">
              {ATTENDANCE_TYPES.map(({ value, label }) => {
                const active = attendanceTypes.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleType(value)}
                    className="rounded-full px-4 py-2 text-[13px] font-medium transition"
                    style={{
                      border: `1px solid ${active ? "rgba(0,135,248,.55)" : "rgba(0,45,115,.55)"}`,
                      background: active ? "rgba(0,135,248,.14)" : "#020d23",
                      color: active ? "#00cbff" : "#6d8698",
                    }}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-[22px]">
            <label htmlFor="difficulty" className={labelCls} style={labelStyle}>Principal dificuldade comercial</label>
            <textarea id="difficulty" required rows={3} value={mainDifficulty} onChange={(e) => setMainDifficulty(e.target.value)} className="field" style={{ resize: "vertical" }} placeholder="Ex.: leads que somem depois do preço, dificuldade em contornar 'vou pensar'…" />
          </div>

          <div className="mt-[18px]">
            <label htmlFor="goal" className={labelCls} style={labelStyle}>Objetivo no treinamento</label>
            <textarea id="goal" required rows={3} value={goal} onChange={(e) => setGoal(e.target.value)} className="field" style={{ resize: "vertical" }} placeholder="Ex.: fechar mais reuniões, melhorar meu diagnóstico, vender com mais segurança…" />
          </div>

          {error && <p className="mt-4 rounded-[10px] border border-[rgba(255,90,80,.28)] bg-[rgba(255,90,80,.08)] px-3.5 py-[11px] text-[13px] text-danger">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-primary mt-6 w-full rounded-[11px] px-4 py-[13px] text-sm font-semibold disabled:opacity-50">
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
