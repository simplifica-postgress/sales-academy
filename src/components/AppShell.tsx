"use client";

import type { ReactNode } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { initials } from "@/lib/ui";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  active: (path: string) => boolean;
}

const iconDash = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="8" rx="2" />
    <rect x="3" y="13" width="8" height="8" rx="2" />
    <rect x="13" y="13" width="8" height="8" rx="2" />
  </svg>
);
const iconUpload = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 16V8" />
    <path d="M8.5 11.5 12 8l3.5 3.5" />
  </svg>
);
const iconHist = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3.2 2" />
  </svg>
);
const iconTeam = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <circle cx="9" cy="8" r="3.4" />
    <path d="M2.8 20c.8-3.4 3.2-5.2 6.2-5.2s5.4 1.8 6.2 5.2" />
    <circle cx="17" cy="9" r="2.6" />
    <path d="M15.6 14.6c2.9.2 4.9 1.9 5.6 4.9" />
  </svg>
);

const SELLER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: iconDash, active: (p) => p === "/dashboard" },
  { label: "Enviar atendimento", href: "/upload", icon: iconUpload, active: (p) => p.startsWith("/upload") },
  { label: "Histórico", href: "/historico", icon: iconHist, active: (p) => p.startsWith("/historico") || p.startsWith("/analise") },
];
const ADMIN_NAV: NavItem[] = [
  { label: "Equipe", href: "/admin", icon: iconTeam, active: (p) => p.startsWith("/admin") },
];

export default function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isAdmin = profile?.role === "admin";
  const nav = isAdmin ? ADMIN_NAV : SELLER_NAV;
  const roleLabel = isAdmin ? "Gestor" : "Vendedor";

  const go = (href: string) => router.push(href);
  const home = isAdmin ? "/admin" : "/dashboard";

  return (
    <div className="flex min-h-screen items-stretch">
      {/* Sidebar (desktop) */}
      <aside className="sticky top-0 hidden h-screen w-[248px] flex-none flex-col gap-2 border-r border-[rgba(0,45,115,.45)] bg-[rgba(2,13,35,.72)] px-4 pb-5 pt-[26px] backdrop-blur-md lg:flex">
        <button onClick={() => go(home)} className="border-b border-[rgba(0,45,115,.4)] px-2.5 pb-[18px] text-left">
          <Image src="/logo.png" alt="Simplifica" width={132} height={35} style={{ width: 132, height: "auto" }} priority />
          <div className="mono-label mt-2.5" style={{ letterSpacing: "0.22em", fontSize: 10 }}>
            Sales Academy
          </div>
        </button>

        <nav className="mt-3 flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const active = item.active(pathname);
            return (
              <button
                key={item.href}
                onClick={() => go(item.href)}
                className={`flex items-center gap-[11px] rounded-[10px] px-3 py-2.5 text-left text-sm font-medium transition ${
                  active ? "text-foreground" : "text-muted hover:text-foreground"
                }`}
                style={{
                  background: active
                    ? "linear-gradient(90deg, rgba(0,135,248,.16), rgba(0,135,248,.03))"
                    : "transparent",
                }}
              >
                <span
                  className="h-4 w-[3px] flex-none rounded-[2px]"
                  style={{ background: active ? "linear-gradient(#0087f8,#00cbff)" : "transparent" }}
                />
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 border-t border-[rgba(0,45,115,.4)] pt-3.5">
          <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border border-[rgba(0,135,248,.4)] text-xs font-semibold text-cyan" style={{ background: "linear-gradient(135deg, rgba(0,82,185,.35), rgba(0,203,255,.14))" }}>
            {initials(profile?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-foreground">{profile?.name || "—"}</div>
            <div className="mono-label mt-0.5" style={{ fontSize: 10, letterSpacing: "0.1em" }}>{roleLabel}</div>
          </div>
          <button onClick={() => signOut()} title="Sair" className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg border border-[rgba(0,45,115,.5)] text-muted transition hover:border-[rgba(0,135,248,.55)] hover:text-foreground">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 4H5v16h4" />
              <path d="M14 8l4 4-4 4" />
              <path d="M18 12H9" />
            </svg>
          </button>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar (mobile) */}
        <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-[rgba(0,45,115,.45)] bg-[rgba(0,4,20,.86)] px-[18px] pb-3 pt-3.5 backdrop-blur-lg lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => go(home)} className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Simplifica" width={112} height={30} style={{ width: 112, height: "auto" }} priority />
              <span className="mono-label border-l border-[rgba(0,45,115,.6)] pl-2.5" style={{ fontSize: 9, letterSpacing: "0.2em" }}>
                Sales Academy
              </span>
            </button>
            <div className="flex items-center gap-2">
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[rgba(0,135,248,.4)] text-[11px] font-semibold text-cyan" style={{ background: "linear-gradient(135deg, rgba(0,82,185,.35), rgba(0,203,255,.14))" }}>
                {initials(profile?.name)}
              </span>
              <button onClick={() => signOut()} className="h-[30px] rounded-lg border border-[rgba(0,45,115,.5)] px-3 text-xs font-medium text-muted transition hover:text-foreground">
                Sair
              </button>
            </div>
          </div>
          <nav className="flex gap-1.5 overflow-x-auto">
            {nav.map((item) => {
              const active = item.active(pathname);
              return (
                <button
                  key={item.href}
                  onClick={() => go(item.href)}
                  className="flex-none rounded-full border px-3.5 py-[7px] text-[13px] font-medium transition"
                  style={{
                    borderColor: active ? "rgba(0,135,248,.5)" : "rgba(0,45,115,.55)",
                    background: active ? "linear-gradient(90deg, rgba(0,135,248,.16), rgba(0,135,248,.03))" : "transparent",
                    color: active ? "#f5f9fb" : "#6d8698",
                  }}
                >
                  {item.label === "Enviar atendimento" ? "Enviar" : item.label}
                </button>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 lg:px-10 lg:py-9">{children}</main>
      </div>
    </div>
  );
}
