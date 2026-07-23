"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/contexts/AuthContext";
import Spinner from "@/components/Spinner";

type Mode = "signin" | "signup" | "reset";

const ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/user-not-found": "Nenhuma conta encontrada com esse e-mail.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/email-already-in-use": "Já existe uma conta com esse e-mail.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/invalid-email": "E-mail inválido.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde um instante e tente de novo.",
  "auth/popup-closed-by-user": "Login com Google cancelado.",
};

function friendlyError(err: unknown): string {
  if (err instanceof FirebaseError) {
    return ERROR_MESSAGES[err.code] ?? "Algo deu errado. Tente novamente.";
  }
  return "Algo deu errado. Tente novamente.";
}

export default function LoginPage() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) router.replace("/");
  }, [loading, user, router]);

  if (loading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  async function handleGoogle() {
    setError("");
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace("/");
    } catch (err) {
      setError(friendlyError(err));
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);
    try {
      if (mode === "reset") {
        await resetPassword(email);
        setInfo("Enviamos um link de redefinição para o seu e-mail.");
        setSubmitting(false);
        return;
      }
      if (mode === "signup") await signUpWithEmail(name.trim(), email, password);
      else await signInWithEmail(email, password);
      router.replace("/");
    } catch (err) {
      setError(friendlyError(err));
      setSubmitting(false);
    }
  }

  function switchMode(next: Mode) {
    setMode(next);
    setError("");
    setInfo("");
  }

  const btnLabel =
    mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link de redefinição";

  return (
    <main className="fade-up flex min-h-screen items-center justify-center px-[18px] py-10">
      <div className="w-full max-w-[410px]">
        <div className="mb-[30px] text-center">
          <Image src="/logo.png" alt="Simplifica — Aceleradora de Negócios" width={200} height={53} style={{ width: 200, height: "auto", margin: "0 auto" }} priority />
          {/* "Sales Academy" como título dominante do produto, empilhado em
              duas linhas: assim as letras ficam grandes (ênfase) sem a frase
              esticar além da largura da logo. Forma um lockup com a logo. */}
          <div
            className="mt-3.5 inline-block font-display font-extrabold uppercase"
            style={{
              fontSize: "clamp(26px,8vw,32px)",
              lineHeight: 0.98,
              letterSpacing: "0.12em",
              paddingRight: "0.12em",
              background: "linear-gradient(100deg,#7f9bff,#9db2ff 55%,#c4cffb)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            Sales<br />Academy
          </div>
        </div>

        {/* Card com borda gradiente */}
        <div className="rounded-[18px] p-px" style={{ background: "linear-gradient(160deg, rgba(90,124,255,.4), rgba(120,150,210,.14) 40%, rgba(127,155,255,.18))" }}>
          <div className="rounded-[17px] bg-card px-7 py-[30px]" style={{ boxShadow: "0 24px 60px rgba(0,2,12,.6)" }}>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={submitting}
              className="flex w-full items-center justify-center gap-[11px] rounded-[11px] border border-[rgba(120,150,210,.17)] bg-card-alt px-4 py-[11px] text-[13.5px] font-medium text-foreground transition hover:border-[rgba(90,124,255,.6)] hover:bg-indicator disabled:opacity-50"
            >
              <svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true">
                <path fill="#4285F4" d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.02.2 3.5 2.7.24.03c2.2-2.1 3.5-5.1 3.5-8.6z" />
                <path fill="#34A853" d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.8-5l-.2.02-3.6 2.8-.05.2C3.3 21.3 7.3 24 12 24z" />
                <path fill="#FBBC05" d="M5.2 14.4c-.3-.8-.4-1.6-.4-2.4s.2-1.7.4-2.4l-.01-.2-3.7-2.8-.12.06C.5 8.2 0 10 0 12s.5 3.8 1.4 5.4l3.8-3z" />
                <path fill="#EB4335" d="M12 4.7c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.4 6.6l3.8 3c.9-2.9 3.6-4.9 6.8-4.9z" />
              </svg>
              Entrar com Google
            </button>

            <div className="my-[22px] flex items-center gap-3">
              <span className="h-px flex-1 bg-[rgba(120,150,210,.15)]" />
              <span className="mono-label" style={{ fontSize: 9.5, letterSpacing: "0.2em" }}>ou</span>
              <span className="h-px flex-1 bg-[rgba(120,150,210,.15)]" />
            </div>

            <form onSubmit={handleSubmit}>
              {mode === "signup" && (
                <div className="mb-4">
                  <label htmlFor="name" className="mono-label mb-[7px] block" style={{ letterSpacing: "0.14em" }}>Nome</label>
                  <input id="name" type="text" required value={name} onChange={(e) => setName(e.target.value)} className="field" placeholder="Seu nome completo" />
                </div>
              )}
              <div className="mb-4">
                <label htmlFor="email" className="mono-label mb-[7px] block" style={{ letterSpacing: "0.14em" }}>E-mail</label>
                <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field" placeholder="voce@empresa.com" />
              </div>
              {mode !== "reset" && (
                <div className="mb-5">
                  <label htmlFor="password" className="mono-label mb-[7px] block" style={{ letterSpacing: "0.14em" }}>Senha</label>
                  <input id="password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="field" placeholder="••••••••" />
                </div>
              )}

              {error && <p className="mb-4 rounded-[10px] border border-[rgba(244,114,106,.28)] bg-[rgba(244,114,106,.08)] px-3.5 py-[11px] text-[13px] text-danger">{error}</p>}
              {info && <p className="mb-4 rounded-[10px] border border-[rgba(127,155,255,.3)] bg-[rgba(127,155,255,.08)] px-3.5 py-[11px] text-[13px] text-cyan">{info}</p>}

              <button type="submit" disabled={submitting} className="btn-primary w-full rounded-[11px] px-4 py-3 text-sm font-semibold disabled:opacity-50">
                {submitting ? "Aguarde…" : btnLabel}
              </button>
            </form>

            <div className="mt-5 flex flex-col items-center gap-[9px]">
              {mode === "signin" && (
                <>
                  <button type="button" onClick={() => switchMode("reset")} className="text-[12.5px] text-muted transition hover:text-cyan">
                    Esqueci minha senha
                  </button>
                  <div className="text-[12.5px] text-muted">
                    Não tem conta?{" "}
                    <button type="button" onClick={() => switchMode("signup")} className="text-[12.5px] font-semibold text-cyan transition hover:text-cyan-light">
                      Criar conta
                    </button>
                  </div>
                </>
              )}
              {mode !== "signin" && (
                <button type="button" onClick={() => switchMode("signin")} className="text-[12.5px] text-muted transition hover:text-cyan">
                  ← Voltar para o login
                </button>
              )}
            </div>
          </div>
        </div>

        <p className="mt-[22px] text-center font-mono text-[11px] text-[rgba(157,178,195,.6)]">
          Simplifica © 2026 · Aceleradora de Negócios
        </p>
      </div>
    </main>
  );
}
