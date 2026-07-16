"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import LandingPage from "@/components/LandingPage";
import Spinner from "@/components/Spinner";

/**
 * Home pública: mostra a landing page para visitantes.
 * Usuário autenticado é encaminhado ao app (dashboard, cadastro ou admin).
 */
export default function Home() {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading || !user) return;
    if (profile?.role === "admin") router.replace("/admin");
    else if (!profile?.profileCompleted) router.replace("/cadastro");
    else router.replace("/dashboard");
  }, [loading, user, profile, router]);

  // Logado: mostra spinner enquanto redireciona (evita flash da landing).
  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return <LandingPage />;
}
