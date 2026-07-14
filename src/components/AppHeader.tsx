"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "./Logo";

export default function AppHeader() {
  const { profile, signOut } = useAuth();
  const pathname = usePathname();
  const isAdmin = profile?.role === "admin";
  const home = isAdmin ? "/admin" : "/dashboard";

  const navLinks = isAdmin
    ? [{ href: "/admin", label: "Equipe" }]
    : [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/historico", label: "Histórico" },
      ];

  return (
    <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-8">
        <Link href={home} className="shrink-0">
          <Logo width={140} />
          <p className="label-dash mt-2">Sales Academy</p>
        </Link>
        <nav className="hidden gap-5 sm:flex">
          {navLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`text-sm font-medium transition ${
                pathname === l.href
                  ? "text-cyan"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
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
