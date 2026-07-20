"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { UserRole } from "@/lib/types";
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

  return <>{children}</>;
}
