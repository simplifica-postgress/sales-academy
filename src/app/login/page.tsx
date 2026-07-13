"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { FirebaseError } from "firebase/app";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import Spinner from "@/components/Spinner";

type Mode = "signin" | "signup" | "reset";

const ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/user-not-found": "Nenhuma conta encontrada com esse e-mail.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/email-already-in-use": "Já existe uma conta com esse e-mail.",
  "auth/weak-password": "A senha precisa ter pelo menos 6 caracteres.",
  "auth/invalid-email": "E-mail inválido.",
  "auth/too-many-requests":
    "Muitas tentativas. Aguarde um instante e tente de novo.",
  "auth/popup-closed-by-user": "Login com Google cancelado.",
};

function friendlyError(err: unknown): string {
  if (err instanceof FirebaseError) {
    return ERROR_MESSAGES[err.code] ?? "Algo deu errado. Tente novamente.";
  }
  return "Algo deu errado. Tente novamente.";
}

const inputClass =
  "w-full rounded-lg border border-card-border bg-card-alt px-3 py-2.5 text-sm text-foreground placeholder-muted/60 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30";

export default function LoginPage() {
  const {
    user,
    loading,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    resetPassword,
  } = useAuth();
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
      if (mode === "signup") {
        await signUpWithEmail(name.trim(), email, password);
      } else {
        await signInWithEmail(email, password);
      }
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

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        {/* Marca */}
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo width={200} />
          <p className="label-dash mt-3">Sales Academy</p>
          <p className="mt-3 text-sm text-muted">
            30 dias para o seu atendimento ideal, com análise de IA a cada
            envio.
          </p>
        </div>

        <div className="rounded-2xl border border-card-border bg-card p-6 shadow-[0_0_40px_rgba(0,135,248,0.08)] sm:p-8">
          <button
            type="button"
            onClick={handleGoogle}
            disabled={submitting}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-card-border bg-card-alt px-4 py-2.5 text-sm font-medium text-foreground transition hover:border-primary/60 hover:bg-indicator disabled:opacity-50"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.5 12.3c0-.9-.1-1.5-.3-2.2H12v4.1h6.5c-.1 1.1-.8 2.7-2.4 3.8l-.02.2 3.5 2.7.24.03c2.2-2.1 3.5-5.1 3.5-8.6z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.2 0 5.9-1.1 7.9-2.9l-3.7-2.9c-1 .7-2.4 1.2-4.2 1.2-3.2 0-5.9-2.1-6.8-5l-.2.02-3.6 2.8-.05.2C3.3 21.3 7.3 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.2 14.4c-.3-.8-.4-1.6-.4-2.4s.2-1.7.4-2.4l-.01-.2-3.7-2.8-.12.06C.5 8.2 0 10 0 12s.5 3.8 1.4 5.4l3.8-3z"
              />
              <path
                fill="#EB4335"
                d="M12 4.7c2.3 0 3.8 1 4.7 1.8l3.4-3.3C18 1.2 15.2 0 12 0 7.3 0 3.3 2.7 1.4 6.6l3.8 3c.9-2.9 3.6-4.9 6.8-4.9z"
              />
            </svg>
            Entrar com Google
          </button>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-card-border" />
            <span className="label-dash">ou</span>
            <div className="h-px flex-1 bg-card-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
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
            )}

            <div>
              <label htmlFor="email" className="label-dash mb-1.5 block">
                E-mail
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="voce@empresa.com"
              />
            </div>

            {mode !== "reset" && (
              <div>
                <label htmlFor="password" className="label-dash mb-1.5 block">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                  placeholder="••••••••"
                />
              </div>
            )}

            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}
            {info && (
              <p className="rounded-lg border border-cyan/30 bg-cyan/10 px-3 py-2 text-sm text-cyan">
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-gradient-to-r from-blue-dark to-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:from-primary hover:to-cyan disabled:opacity-50"
            >
              {submitting
                ? "Aguarde…"
                : mode === "signin"
                  ? "Entrar"
                  : mode === "signup"
                    ? "Criar conta"
                    : "Enviar link de redefinição"}
            </button>
          </form>

          <div className="mt-5 flex flex-col items-center gap-2 text-sm">
            {mode === "signin" && (
              <>
                <button
                  type="button"
                  onClick={() => switchMode("reset")}
                  className="text-muted transition hover:text-cyan"
                >
                  Esqueci minha senha
                </button>
                <p className="text-muted">
                  Não tem conta?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("signup")}
                    className="font-semibold text-cyan transition hover:text-cyan-light"
                  >
                    Criar conta
                  </button>
                </p>
              </>
            )}
            {mode !== "signin" && (
              <button
                type="button"
                onClick={() => switchMode("signin")}
                className="text-muted transition hover:text-cyan"
              >
                ← Voltar para o login
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
