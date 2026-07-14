"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "./Logo";

export default function AppHeader() {
  const { profile, signOut } = useAuth();

  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <Link href="/dashboard" className="shrink-0">
        <Logo width={150} />
        <p className="label-dash mt-2">Sales Academy</p>
      </Link>
      <div className="flex items-center gap-3">
        {profile?.name ? (
          <span className="hidden text-sm text-muted sm:inline">
            {profile.name}
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => signOut()}
          className="rounded-lg border border-card-border bg-card-alt px-4 py-2 text-sm font-medium text-muted transition hover:border-primary/50 hover:text-foreground"
        >
          Sair
        </button>
      </div>
    </header>
  );
}
