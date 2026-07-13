"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Spinner from "./Spinner";

/**
 * Protege rotas autenticadas:
 * - não logado → /login
 * - logado sem perfil completo → /cadastro
 * - logado com perfil completo tentando acessar /cadastro → /dashboard
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Perfil nulo (doc ainda não criado/carregado) também exige cadastro.
  const needsProfile = Boolean(user && !profile?.profileCompleted);
  const onboardingRoute = pathname === "/cadastro";

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (needsProfile && !onboardingRoute) {
      router.replace("/cadastro");
    } else if (!needsProfile && onboardingRoute) {
      router.replace("/dashboard");
    }
  }, [loading, user, needsProfile, onboardingRoute, router]);

  if (
    loading ||
    !user ||
    (needsProfile && !onboardingRoute) ||
    (!needsProfile && onboardingRoute)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <>{children}</>;
}
