"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { hasAccess, paywallLigado } from "@/lib/subscription";
import type { UserRole } from "@/lib/types";
import AssinaturaNecessaria from "./AssinaturaNecessaria";
import Spinner from "./Spinner";

/**
 * Protege rotas autenticadas:
 * - não logado → /login
 * - logado sem perfil completo → /cadastro
 * - logado com perfil completo tentando acessar /cadastro → home do papel
 * - allow: só os papéis listados entram (os demais vão para a home deles)
 *
 * Isto é conveniência de navegação, não segurança: quem manda de verdade são
 * as Rules do Firestore e os endpoints, que checam papel no servidor.
 */
export default function AuthGate({
  children,
  allow,
}: {
  children: ReactNode;
  allow?: UserRole[];
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const role: UserRole = profile?.role ?? "seller";
  const isStaff = role === "manager" || role === "master";
  const home = isStaff ? "/admin" : "/dashboard";

  // Gestor e master não passam pelo onboarding de vendedor.
  const needsProfile = Boolean(user && !isStaff && !profile?.profileCompleted);
  const onboardingRoute = pathname === "/cadastro";
  const blockedByRole = Boolean(
    user && allow && profile && !allow.includes(role)
  );

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (blockedByRole) {
      router.replace(home);
    } else if (needsProfile && !onboardingRoute) {
      router.replace("/cadastro");
    } else if (!needsProfile && onboardingRoute) {
      router.replace(home);
    }
  }, [
    loading,
    user,
    needsProfile,
    onboardingRoute,
    blockedByRole,
    home,
    router,
  ]);

  if (
    loading ||
    !user ||
    blockedByRole ||
    (needsProfile && !onboardingRoute) ||
    (!needsProfile && onboardingRoute)
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  // Bloqueio por assinatura. Fica AQUI, e não só no AppShell, porque nem toda
  // tela de dentro usa o AppShell — /cadastro não usa, e era por ali que dava
  // para entrar sem pagar: bastava fechar o checkout e voltar depois.
  // Configurações continua livre: é onde a pessoa assina (trancar seria
  // trancar a saída).
  if (
    paywallLigado() &&
    profile &&
    !hasAccess(profile) &&
    !pathname.startsWith("/configuracoes")
  ) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <AssinaturaNecessaria
          nome={profile.name?.split(" ")[0]}
          encerrada={
            profile.subscriptionStatus === "canceled" ||
            profile.subscriptionStatus === "canceling"
          }
        />
      </div>
    );
  }

  return <>{children}</>;
}
