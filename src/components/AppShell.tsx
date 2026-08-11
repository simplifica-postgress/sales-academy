"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { initials } from "@/lib/ui";
import { hasAccess, paywallLigado } from "@/lib/subscription";
import AssinaturaNecessaria from "@/components/AssinaturaNecessaria";

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

const iconGear = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <circle cx="12" cy="12" r="3.2" />
    <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.5-2.4 1a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.5z" />
  </svg>
);

const iconVideo = (
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
    <rect x="3" y="5" width="18" height="14" rx="3" />
    <path d="M10.5 9.5v5l4-2.5z" fill="currentColor" stroke="none" />
  </svg>
);

/** Aulas: todo mundo assiste (o master gerencia em /admin/videos). */
const lessonsItem: NavItem = {
  label: "Vídeos e aulas",
  href: "/aulas",
  icon: iconVideo,
  active: (p) => p.startsWith("/aulas"),
};

const SELLER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: iconDash, active: (p) => p === "/dashboard" },
  { label: "Enviar atendimento", href: "/upload", icon: iconUpload, active: (p) => p.startsWith("/upload") },
  { label: "Histórico", href: "/historico", icon: iconHist, active: (p) => p.startsWith("/historico") || p.startsWith("/analise") },
  lessonsItem,
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
const ADMIN_SECTIONS = ["usuarios", "conhecimento", "testar-ia", "empresa", "videos"];

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

/** Master: organiza empresas, pessoas e o conteúdo que alimenta a IA. */
const MASTER_NAV: NavItem[] = [
  homeItem("Empresas"),
  { label: "Usuários", href: "/admin/usuarios", icon: iconUsers, active: (p) => p.startsWith("/admin/usuarios") },
  { label: "Princípios e Casos", href: "/admin/conhecimento", icon: iconBook, active: (p) => p.startsWith("/admin/conhecimento") },
  { label: "Vídeos e aulas", href: "/admin/videos", icon: iconVideo, active: (p) => p.startsWith("/admin/videos") || p.startsWith("/aulas") },
  testItem,
];

/** Gestor: vê a própria equipe, assiste às aulas, lê o método e testa a IA. */
const MANAGER_NAV: NavItem[] = [homeItem("Equipe"), lessonsItem, principlesItem, testItem];

/**
 * Preferência de sidebar recolhida, guardada no navegador.
 *
 * Fica fora do React porque é estado do NAVEGADOR, não do componente: lido
 * com useSyncExternalStore, que sabe lidar com o servidor (onde localStorage
 * não existe) sem precisar de efeito nem de estado duplicado.
 */
const CHAVE_SIDEBAR = "sidebarRecolhida";
let ouvintesSidebar: (() => void)[] = [];

function assinarSidebar(aoMudar: () => void) {
  ouvintesSidebar.push(aoMudar);
  // "storage" cobre o caso de duas abas abertas ao mesmo tempo.
  window.addEventListener("storage", aoMudar);
  return () => {
    ouvintesSidebar = ouvintesSidebar.filter((o) => o !== aoMudar);
    window.removeEventListener("storage", aoMudar);
  };
}

function lerSidebar(): boolean {
  return localStorage.getItem(CHAVE_SIDEBAR) === "1";
}

function definirSidebar(recolhida: boolean) {
  localStorage.setItem(CHAVE_SIDEBAR, recolhida ? "1" : "0");
  for (const avisar of ouvintesSidebar) avisar();
}

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

  // Sidebar recolhida: sobra largura para as tabelas do painel, que são o
  // motivo de existir esse botão. A escolha fica salva — ninguém quer
  // recolher de novo a cada visita.
  const recolhida = useSyncExternalStore(assinarSidebar, lerSidebar, () => false);
  const alternarSidebar = () => definirSidebar(!recolhida);

  // Bloqueio por assinatura. Configurações fica SEMPRE acessível: é lá que a
  // pessoa vê o estado da conta e assina — trancá-la seria trancar a saída.
  const bloqueado =
    paywallLigado() &&
    !!profile &&
    !hasAccess(profile) &&
    !pathname.startsWith("/configuracoes");

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
      <aside
        className={`sticky top-0 hidden h-screen flex-none flex-col gap-2 border-r border-[rgba(120,150,210,.13)] bg-[rgba(2,13,35,.72)] pb-5 pt-[26px] backdrop-blur-md min-[900px]:flex ${
          recolhida ? "w-[72px] px-2.5" : "w-[248px] px-4"
        } motion-safe:transition-[width] motion-safe:duration-200`}
      >
        <button
          onClick={() => go(home)}
          className={`border-b border-[rgba(120,150,210,.12)] pb-[18px] ${recolhida ? "flex justify-center" : "px-2.5 text-left"}`}
          title={recolhida ? "Sales Academy" : undefined}
        >
          {recolhida ? (
            <span
              className="flex h-[34px] w-[34px] items-center justify-center rounded-[10px] font-display text-[17px] font-extrabold text-white"
              style={{ background: "linear-gradient(150deg,#4a6edc,#7f9bff)" }}
            >
              S
            </span>
          ) : (
            <>
              <Image src="/logo.png" alt="Simplifica" width={132} height={35} style={{ width: 132, height: "auto" }} priority />
              <div className="mono-label mt-2.5" style={{ letterSpacing: "0.22em", fontSize: 10 }}>
                Sales Academy
              </div>
            </>
          )}
        </button>

        <nav className="mt-3 flex flex-1 flex-col gap-1">
          {nav.map((item) => {
            const active = item.active(pathname);
            return (
              <button
                key={item.href}
                onClick={() => go(item.href)}
                // Recolhida, o rótulo vira tooltip — sem ele os ícones viram adivinhação.
                title={recolhida ? item.label : undefined}
                className={`flex items-center rounded-[10px] py-2.5 text-sm font-medium transition ${
                  recolhida ? "justify-center px-0" : "gap-[11px] px-3 text-left"
                } ${active ? "text-foreground" : "text-muted hover:text-foreground"}`}
                style={{
                  background: active
                    ? "linear-gradient(90deg, rgba(90,124,255,.16), rgba(90,124,255,.03))"
                    : "transparent",
                }}
              >
                {!recolhida && (
                  <span
                    className="h-4 w-[3px] flex-none rounded-[2px]"
                    style={{ background: active ? "linear-gradient(#5a7cff,#7f9bff)" : "transparent" }}
                  />
                )}
                <span style={active && recolhida ? { color: "#7f9bff" } : undefined}>{item.icon}</span>
                {!recolhida && item.label}
              </button>
            );
          })}
        </nav>

        {/* Recolher / expandir */}
        <button
          onClick={alternarSidebar}
          title={recolhida ? "Expandir menu" : "Recolher menu"}
          aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
          className={`flex items-center rounded-[10px] py-2 text-[12.5px] font-medium text-muted transition hover:text-foreground ${
            recolhida ? "justify-center px-0" : "gap-[11px] px-3"
          }`}
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            style={{ transform: recolhida ? "rotate(180deg)" : undefined }}
          >
            <path d="M14 7l-5 5 5 5" />
            <path d="M19 4v16" />
          </svg>
          {!recolhida && "Recolher menu"}
        </button>

        {/* Configurações: canto inferior esquerdo, logo acima do perfil. */}
        <button
          onClick={() => go("/configuracoes")}
          title={recolhida ? "Configurações" : undefined}
          className={`flex items-center rounded-[10px] py-2.5 text-sm font-medium transition ${
            recolhida ? "justify-center px-0" : "gap-[11px] px-3 text-left"
          } ${pathname.startsWith("/configuracoes") ? "text-foreground" : "text-muted hover:text-foreground"}`}
          style={{
            background: pathname.startsWith("/configuracoes")
              ? "linear-gradient(90deg, rgba(90,124,255,.16), rgba(90,124,255,.03))"
              : "transparent",
          }}
        >
          {!recolhida && (
            <span
              className="h-4 w-[3px] flex-none rounded-[2px]"
              style={{ background: pathname.startsWith("/configuracoes") ? "linear-gradient(#5a7cff,#7f9bff)" : "transparent" }}
            />
          )}
          <span style={pathname.startsWith("/configuracoes") && recolhida ? { color: "#7f9bff" } : undefined}>{iconGear}</span>
          {!recolhida && "Configurações"}
        </button>

        <div
          className={`flex items-center border-t border-[rgba(120,150,210,.12)] pt-3.5 ${
            recolhida ? "flex-col gap-2" : "gap-2.5"
          }`}
        >
          <span
            className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border border-[rgba(90,124,255,.4)] text-xs font-semibold text-cyan"
            style={{ background: "linear-gradient(135deg, rgba(0,82,185,.35), rgba(127,155,255,.14))" }}
            title={recolhida ? `${profile?.name || "—"} · ${roleLabel}` : undefined}
          >
            {initials(profile?.name)}
          </span>
          {!recolhida && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold text-foreground">{profile?.name || "—"}</div>
              <div className="mono-label mt-0.5" style={{ fontSize: 10, letterSpacing: "0.1em" }}>{roleLabel}</div>
            </div>
          )}
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
        {/* Header do celular (abaixo de 900px): só marca + conta. A navegação
            foi para a barra inferior, no alcance do polegar. */}
        <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[rgba(120,150,210,.13)] bg-[rgba(0,4,20,.86)] px-[18px] py-3 backdrop-blur-lg min-[900px]:hidden">
          <button onClick={() => go(home)} className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Simplifica" width={118} height={31} style={{ width: 118, height: "auto" }} priority />
            <span className="mono-label border-l border-[rgba(120,150,210,.16)] pl-2.5" style={{ fontSize: 9, letterSpacing: "0.2em" }}>
              Sales Academy
            </span>
          </button>
          <div className="flex items-center gap-2">
            <span className="flex h-[32px] w-[32px] items-center justify-center rounded-full border border-[rgba(90,124,255,.4)] text-[11px] font-semibold text-cyan" style={{ background: "linear-gradient(135deg, rgba(0,82,185,.35), rgba(127,155,255,.14))" }}>
              {initials(profile?.name)}
            </span>
            <button onClick={() => go("/configuracoes")} className="flex h-[32px] w-[32px] items-center justify-center rounded-lg border border-[rgba(120,150,210,.14)] text-muted transition hover:text-foreground" title="Configurações">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="12" r="3.2" />
                <path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.5-2.4 1a7.6 7.6 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5a7.6 7.6 0 0 0-2.6 1.5l-2.4-1-2 3.5 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.5 2.4-1a7.6 7.6 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.6 7.6 0 0 0 2.6-1.5l2.4 1 2-3.5z" />
              </svg>
            </button>
            <button onClick={() => signOut()} className="flex h-[32px] w-[32px] items-center justify-center rounded-lg border border-[rgba(120,150,210,.14)] text-muted transition hover:text-foreground" title="Sair">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M9 4H5v16h4" /><path d="M14 8l4 4-4 4" /><path d="M18 12H9" />
              </svg>
            </button>
          </div>
        </header>

        {/* pb no celular: espaço para a barra inferior fixa não cobrir o conteúdo. */}
        <main className="mx-auto w-full max-w-[1180px] flex-1 px-4 py-5 pb-[92px] lg:px-10 lg:py-9 min-[900px]:pb-9">
          {bloqueado && (
            <AssinaturaNecessaria
              nome={profile?.name?.split(" ")[0]}
              encerrada={profile?.subscriptionStatus === "canceled" || profile?.subscriptionStatus === "canceling"}
            />
          )}
          {!bloqueado && showBack && (
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
          {!bloqueado && children}
        </main>
      </div>

      {/* Navegação inferior fixa (só celular). Respeita a safe-area do iPhone. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex border-t border-[rgba(120,150,210,.14)] bg-[rgba(4,8,20,.94)] backdrop-blur-lg min-[900px]:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        {nav.map((item) => {
          const active = item.active(pathname);
          return (
            <button
              key={item.href}
              onClick={() => go(item.href)}
              className="flex min-w-0 flex-1 flex-col items-center gap-1 px-1 pb-2 pt-2.5 transition"
              style={{ color: active ? "#7f9bff" : "#79839c" }}
            >
              <span className="flex h-[22px] items-center justify-center" style={active ? { filter: "drop-shadow(0 0 6px rgba(127,155,255,.5))" } : undefined}>
                {item.icon}
              </span>
              <span className="w-full truncate text-center text-[10px] font-semibold leading-none" style={{ letterSpacing: "0.01em" }}>
                {navShortLabel(item.label)}
              </span>
              {active && <span className="mt-0.5 h-[3px] w-4 rounded-full bg-primary" />}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

/** Rótulo curto para a barra inferior (espaço apertado no celular). */
function navShortLabel(label: string): string {
  const mapa: Record<string, string> = {
    "Enviar atendimento": "Enviar",
    "Princípios e Casos": "Princípios",
    "Vídeos e aulas": "Vídeos",
  };
  return mapa[label] ?? label;
}
