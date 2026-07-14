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
 * - requireAdmin: bloqueia quem não é gestor (→ /dashboard)
 */
export default function AuthGate({
  children,
  requireAdmin = false,
}: {
  children: ReactNode;
  requireAdmin?: boolean;
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAdmin = profile?.role === "admin";
  // Admins não passam pelo onboarding de vendedor.
  const needsProfile = Boolean(user && !isAdmin && !profile?.profileCompleted);
  const onboardingRoute = pathname === "/cadastro";
  const blockedByAdmin = Boolean(user && requireAdmin && profile && !isAdmin);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    } else if (blockedByAdmin) {
      router.replace("/dashboard");
    } else if (needsProfile && !onboardingRoute) {
      router.replace("/cadastro");
    } else if (!needsProfile && onboardingRoute) {
      router.replace(isAdmin ? "/admin" : "/dashboard");
    }
  }, [
    loading,
    user,
    needsProfile,
    onboardingRoute,
    blockedByAdmin,
    isAdmin,
    router,
  ]);

  if (
    loading ||
    !user ||
    blockedByAdmin ||
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
