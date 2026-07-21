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

const iconPrinciples = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z" />
    <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z" />
  </svg>
);

const principlesItem: NavItem = {
  label: "Princípios e Casos",
  href: "/principios",
  icon: iconPrinciples,
  active: (p) => p.startsWith("/principios"),
};

const SELLER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: iconDash, active: (p) => p === "/dashboard" },
  { label: "Enviar atendimento", href: "/upload", icon: iconUpload, active: (p) => p.startsWith("/upload") },
  { label: "Histórico", href: "/historico", icon: iconHist, active: (p) => p.startsWith("/historico") || p.startsWith("/analise") },
  principlesItem,
];
const iconUsers = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c.9-3.6 3.6-5.5 7-5.5s6.1 1.9 7 5.5" />
  </svg>
);
const iconBook = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H19v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
    <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H19v3H6.5A2.5 2.5 0 0 1 4 20.5z" />
  </svg>
);
const iconLab = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <path d="M9 3v6.5L4.5 18a2 2 0 0 0 1.8 3h11.4a2 2 0 0 0 1.8-3L15 9.5V3" />
    <path d="M8 3h8" />
  </svg>
);

// Seções fixas do admin; o resto de /admin/* é detalhe de vendedor ou empresa.
const ADMIN_SECTIONS = ["usuarios", "conhecimento", "testar-ia", "empresa"];

const homeItem = (label: string): NavItem => ({
  label,
  href: "/admin",
  icon: iconTeam,
  active: (p) =>
    p === "/admin" ||
    (p.startsWith("/admin/") && !ADMIN_SECTIONS.includes(p.split("/")[2])),
});

const testItem: NavItem = {
  label: "Testar IA",
  href: "/admin/testar-ia",
  icon: iconLab,
  active: (p) => p.startsWith("/admin/testar-ia"),
};

/** Master: organiza empresas, pessoas e a base da IA. */
const MASTER_NAV: NavItem[] = [
  homeItem("Empresas"),
  { label: "Usuários", href: "/admin/usuarios", icon: iconUsers, active: (p) => p.startsWith("/admin/usuarios") },
  { label: "Conhecimento", href: "/admin/conhecimento", icon: iconBook, active: (p) => p.startsWith("/admin/conhecimento") },
  testItem,
];

/** Gestor: vê a própria equipe, lê o método e testa a IA. */
const MANAGER_NAV: NavItem[] = [homeItem("Equipe"), principlesItem, testItem];

export default function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const role = profile?.role ?? "seller";
  const isMaster = role === "master";
  const isStaff = isMaster || role === "manager";
  const nav = isMaster ? MASTER_NAV : role === "manager" ? MANAGER_NAV : SELLER_NAV;
  const roleLabel = isMaster ? "Simplifica" : role === "manager" ? "Gestor" : "Vendedor";

  const go = (href: string) => router.push(href);
  const home = isStaff ? "/admin" : "/dashboard";

  // Botão de voltar: aparece em toda página que não é a inicial do papel.
  const showBack = pathname !== home;
  const goBack = () => {
    // Se não há histórico dentro do app (ex.: link direto), cai na home.
    if (window.history.length > 1) router.back();
    else router.push(home);
  };

  return (
    <div className="flex min-h-screen items-stretch">
      {/* Sidebar (desktop e notebook) */}
      <aside className="sticky top-0 hidden h-screen w-[248px] flex-none flex-col gap-2 border-r border-[rgba(120,150,210,.13)] bg-[rgba(2,13,35,.72)] px-4 pb-5 pt-[26px] backdrop-blur-md min-[900px]:flex">
        <button onClick={() => go(home)} className="border-b border-[rgba(120,150,210,.12)] px-2.5 pb-[18px] text-left">
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
                    ? "linear-gradient(90deg, rgba(90,124,255,.16), rgba(90,124,255,.03))"
                    : "transparent",
                }}
              >
                <span
                  className="h-4 w-[3px] flex-none rounded-[2px]"
                  style={{ background: active ? "linear-gradient(#5a7cff,#7f9bff)" : "transparent" }}
                />
                {item.icon}
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2.5 border-t border-[rgba(120,150,210,.12)] pt-3.5">
          <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border border-[rgba(90,124,255,.4)] text-xs font-semibold text-cyan" style={{ background: "linear-gradient(135deg, rgba(0,82,185,.35), rgba(127,155,255,.14))" }}>
            {initials(profile?.name)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[13px] font-semibold text-foreground">{profile?.name || "—"}</div>
            <div className="mono-label mt-0.5" style={{ fontSize: 10, letterSpacing: "0.1em" }}>{roleLabel}</div>
          </div>
          <button onClick={() => signOut()} title="Sair" className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg border border-[rgba(120,150,210,.14)] text-muted transition hover:border-[rgba(90,124,255,.55)] hover:text-foreground">
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
        {/* Topbar (apenas celular, abaixo de 900px) */}
        <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-[rgba(120,150,210,.13)] bg-[rgba(0,4,20,.86)] px-[18px] pb-3 pt-3.5 backdrop-blur-lg min-[900px]:hidden">
          <div className="flex items-center justify-between gap-3">
            <button onClick={() => go(home)} className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Simplifica" width={112} height={30} style={{ width: 112, height: "auto" }} priority />
              <span className="mono-label border-l border-[rgba(120,150,210,.16)] pl-2.5" style={{ fontSize: 9, letterSpacing: "0.2em" }}>
                Sales Academy
              </span>
            </button>
            <div className="flex items-center gap-2">
              <span className="flex h-[30px] w-[30px] items-center justify-center rounded-full border border-[rgba(90,124,255,.4)] text-[11px] font-semibold text-cyan" style={{ background: "linear-gradient(135deg, rgba(0,82,185,.35), rgba(127,155,255,.14))" }}>
                {initials(profile?.name)}
              </span>
              <button onClick={() => signOut()} className="h-[30px] rounded-lg border border-[rgba(120,150,210,.14)] px-3 text-xs font-medium text-muted transition hover:text-foreground">
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
                    borderColor: active ? "rgba(90,124,255,.5)" : "rgba(120,150,210,.15)",
                    background: active ? "linear-gradient(90deg, rgba(90,124,255,.16), rgba(90,124,255,.03))" : "transparent",
                    color: active ? "#ffffff" : "#79839c",
                  }}
                >
                  {item.label === "Enviar atendimento" ? "Enviar" : item.label}
                </button>
              );
            })}
          </nav>
        </header>

        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-6 lg:px-10 lg:py-9">
          {showBack && (
            <button
              onClick={goBack}
              className="mb-4 inline-flex items-center gap-2 rounded-lg border border-[rgba(120,150,210,.16)] bg-card-alt px-3.5 py-2 text-[12.5px] font-medium text-muted transition hover:border-[rgba(90,124,255,.5)] hover:text-foreground"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
              Voltar
            </button>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
