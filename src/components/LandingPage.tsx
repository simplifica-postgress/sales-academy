"use client";

import Image from "next/image";
import Link from "next/link";

const WHATSAPP =
  "https://wa.me/5531992994925?text=Ol%C3%A1%2C%20vim%20pelo%20site%20e%20gostaria%20de%20mais%20informa%C3%A7%C3%B5es.";
const INSTAGRAM = "https://www.instagram.com/simplifica.aceleradora";
const YOUTUBE = "https://www.youtube.com/@SimplificaMKTeVendas";

const cardStyle = {
  background: "#03112d",
  border: "1px solid rgba(0,45,115,0.6)",
};

function Check() {
  return (
    <span className="mt-0.5 flex h-[19px] w-[19px] flex-none items-center justify-center rounded-full border border-[rgba(255,255,255,.9)] bg-white text-[10px] font-semibold text-primary">
      ✓
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan">
      {children}
    </span>
  );
}

const STEPS = [
  { n: "01", title: "Envie o atendimento real", desc: "Áudio ou vídeo da ligação, reunião ou WhatsApp — direto do celular, em menos de um minuto.", icon: <path d="M12 3v10M7.5 7.5 12 3l4.5 4.5M4 15v3a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3v-3" /> },
  { n: "02", title: "A IA analisa a conversa", desc: "Transcrição completa e nota em 8 critérios comerciais — do diagnóstico ao fechamento.", icon: <path d="M3 12h2l2-5 3 10 3-14 3 12 2-3h3" /> },
  { n: "03", title: "Receba a missão do dia", desc: "O que você fez bem, o que deixou passar e uma missão prática para o próximo atendimento.", icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></> },
  { n: "04", title: "Evolua nível a nível", desc: "Do improviso ao atendimento ideal: 5 níveis em 30 dias, com progresso visível para todos.", icon: <path d="M4 19h16M6 16l4-5 3.5 3 4.5-6" /> },
];

const PAINS = [
  "Você já investe em anúncios, mas sente que as vendas não acompanham.",
  "Seus vendedores não seguem uma rotina clara de atendimento.",
  "Cada um vende de um jeito — o resultado depende de talento, não de método.",
  'O "vou pensar" encerra a conversa e ninguém trata a objeção.',
  "O resultado do mês depende de você cobrando a equipe o tempo todo.",
  "Falta clareza sobre o que realmente trava a conversão.",
];

const CREDS = [
  { title: "Google Partner", sub: "empresa certificada", icon: <path d="M12 3l7 3v5c0 4.4-3 8.4-7 10-4-1.6-7-5.6-7-10V6z M9 12l2 2 4-4.5" /> },
  { title: "+6 milhões", sub: "gerenciados em anúncios", icon: <path d="M4 19h16M6 16l4-5 3.5 3 4.5-6" /> },
  { title: "Centenas de empresas", sub: "atendidas pela Simplifica", icon: <><circle cx="9" cy="8" r="3.2" /><path d="M3 19.5c.8-3.2 3-5 6-5s5.2 1.8 6 5" /><circle cx="17" cy="9" r="2.5" /><path d="M15.8 14.4c2.7.2 4.5 1.8 5.2 4.6" /></> },
  { title: "Gestor dedicado", sub: "focado no seu negócio", icon: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" fill="currentColor" /></> },
];

const btnPrimary =
  "inline-flex items-center gap-2.5 rounded-xl px-7 py-3.5 text-[15px] font-semibold text-white transition hover:-translate-y-0.5";
const btnPrimaryStyle = {
  background: "linear-gradient(135deg,#0052b9,#0087f8)",
  boxShadow: "0 10px 30px rgba(0,135,248,.32)",
};

export default function LandingPage() {
  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(1200px 560px at 72% -10%, rgba(0,135,248,.13), transparent 62%), radial-gradient(900px 520px at -10% 30%, rgba(0,203,255,.05), transparent 60%), #000414",
        overflowX: "clip",
      }}
    >
      {/* Urgência */}
      <div className="border-b border-[rgba(0,135,248,.25)] px-4 py-2.5 text-center text-[12.5px] font-medium text-white" style={{ background: "linear-gradient(90deg, rgba(0,82,185,.28), rgba(0,135,248,.16), rgba(0,203,255,.1))" }}>
        🔥 Vagas limitadas — atendemos apenas <strong className="text-cyan">10 empresas por ciclo</strong> de acompanhamento
      </div>

      {/* Topbar */}
      <header className="sticky top-0 z-50 border-b border-[rgba(0,45,115,.45)] backdrop-blur-lg" style={{ background: "rgba(0,4,20,.85)" }}>
        <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-4 px-6 py-3.5">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Simplifica — Aceleradora de Negócios" width={128} height={34} style={{ width: 128, height: "auto" }} priority />
            <span className="mono-label border-l border-[rgba(0,45,115,.6)] pl-2.5" style={{ fontSize: 9, letterSpacing: "0.2em" }}>Sales Academy</span>
          </div>
          <nav className="flex flex-wrap items-center gap-[22px]">
            <a href="#metodo" className="text-[13.5px] font-medium text-muted transition hover:text-foreground">Como funciona</a>
            <a href="#beneficios" className="text-[13.5px] font-medium text-muted transition hover:text-foreground">Benefícios</a>
            <a href="#resultados" className="text-[13.5px] font-medium text-muted transition hover:text-foreground">Resultados</a>
            <a href="#quem-somos" className="text-[13.5px] font-medium text-muted transition hover:text-foreground">Quem somos</a>
            <Link href="/login" className="inline-flex items-center gap-2 rounded-[10px] px-[18px] py-2.5 text-[13px] font-semibold text-white transition hover:-translate-y-0.5" style={btnPrimaryStyle}>Entrar na plataforma</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-[1140px] px-6 pb-[30px] pt-[84px] text-center">
        <div className="fade-up">
          <SectionLabel>
            <span className="inline-block rounded-full border border-[rgba(0,203,255,.25)] px-4 py-[7px]" style={{ background: "rgba(0,203,255,.07)" }}>Treinamento comercial · 30 dias</span>
          </SectionLabel>
        </div>
        <h1 className="mx-auto mt-[26px] max-w-[860px] font-semibold leading-[1.12] tracking-[-0.025em] text-white" style={{ fontSize: "clamp(32px,5vw,56px)", textWrap: "balance" }}>
          Transforme seu time comercial em uma{" "}
          <span style={{ background: "linear-gradient(90deg,#0087f8,#00e3ff)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent" }}>máquina de vendas</span> em 30 dias.
        </h1>
        <p className="mx-auto mt-[22px] max-w-[640px] leading-[1.65] text-muted" style={{ fontSize: "clamp(15px,1.6vw,17px)" }}>
          O vendedor envia o áudio do atendimento real, a IA analisa a conversa e devolve nota, plano de melhoria e a missão do dia. Todos os dias, por 30 dias — com o gestor acompanhando tudo.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/login" className={btnPrimary} style={btnPrimaryStyle}>Começar meu treinamento →</Link>
          <a href="#metodo" className="inline-flex items-center gap-2.5 rounded-xl border border-[rgba(0,45,115,.65)] bg-card-alt px-7 py-3.5 text-[15px] font-semibold text-white transition hover:border-[rgba(0,135,248,.6)]">Ver como funciona</a>
        </div>

        {/* Screenshot */}
        <div className="fade-up relative mx-auto mt-16 max-w-[980px]">
          <div className="pointer-events-none absolute inset-x-[-12%] top-[-8%] h-[70%]" style={{ background: "radial-gradient(closest-side, rgba(0,135,248,.22), transparent 70%)", filter: "blur(30px)" }} />
          <div className="relative rounded-[18px] p-px" style={{ background: "linear-gradient(160deg, rgba(0,135,248,.55), rgba(0,45,115,.5) 35%, rgba(0,203,255,.3))" }}>
            <Image src="/app-dashboard.png" alt="Dashboard da Sales Academy — nota, progresso e missão do dia" width={980} height={620} className="block h-auto w-full rounded-[17px]" style={{ background: "#03112d" }} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[120px] rounded-b-[17px]" style={{ background: "linear-gradient(180deg, transparent, rgba(0,4,20,.85))" }} />
          </div>
        </div>
      </section>

      {/* Credibilidade */}
      <section className="mx-auto max-w-[1140px] px-6 pt-[26px]">
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          {CREDS.map((c) => (
            <div key={c.title} className="flex items-center gap-[13px] rounded-[14px] px-5 py-[18px]" style={cardStyle}>
              <span className="flex h-[38px] w-[38px] flex-none items-center justify-center rounded-[10px] border border-[rgba(255,255,255,.9)] bg-white text-primary">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{c.icon}</svg>
              </span>
              <div>
                <div className="text-[14.5px] font-semibold text-white">{c.title}</div>
                <div className="mt-0.5 text-[12px] text-muted">{c.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Dores */}
      <section className="mx-auto max-w-[1140px] px-6 pt-[100px]">
        <div className="grid items-start gap-10" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <div>
            <SectionLabel>Isso acontece aí?</SectionLabel>
            <h2 className="mt-4 font-semibold leading-[1.18] tracking-[-0.02em] text-white" style={{ fontSize: "clamp(26px,3.2vw,38px)", textWrap: "balance" }}>
              Se o seu comercial se encaixa em algum desses cenários, a Sales Academy foi feita para você:
            </h2>
            <p className="mt-5 text-[15px] leading-[1.65] text-muted">
              Marcou <strong className="text-white">&quot;sim&quot; em pelo menos dois pontos</strong>? O problema não está no marketing — está no método de atendimento. E método se treina.
            </p>
            <Link href="/login" className="mt-[26px] inline-flex items-center gap-2.5 rounded-xl px-6 py-[13px] text-[14px] font-semibold text-white transition hover:-translate-y-0.5" style={btnPrimaryStyle}>Quero acelerar meu comercial agora</Link>
          </div>
          <div className="flex flex-col gap-2.5">
            {PAINS.map((p) => (
              <div key={p} className="flex gap-[13px] rounded-[13px] px-[18px] py-4" style={cardStyle}>
                <span className="mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-md border border-[rgba(255,255,255,.9)] bg-white text-[11px] font-semibold text-primary">✓</span>
                <span className="text-[14px] leading-[1.55] text-white">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Método */}
      <section id="metodo" className="mx-auto max-w-[1140px] scroll-mt-[84px] px-6 pt-[110px]">
        <div className="mx-auto max-w-[680px] text-center">
          <SectionLabel>Nosso método</SectionLabel>
          <h2 className="mt-4 font-semibold leading-[1.15] tracking-[-0.02em] text-white" style={{ fontSize: "clamp(26px,3.4vw,40px)", textWrap: "balance" }}>30 dias para o atendimento ideal</h2>
          <p className="mt-[18px] text-[15px] leading-[1.65] text-muted">
            Sem aula gravada, sem teoria solta. O treino acontece em cima dos <strong className="text-white">seus atendimentos reais</strong>, com análise de IA e acompanhamento do gestor.
          </p>
        </div>
        <div className="mt-11 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
          {STEPS.map((s) => (
            <div key={s.n} className="rounded-2xl px-6 py-[26px] transition hover:-translate-y-[3px]" style={cardStyle}>
              <div className="flex items-center justify-between">
                <span className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-[rgba(255,255,255,.9)] bg-white text-primary">
                  <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">{s.icon}</svg>
                </span>
                <span className="text-[13px] font-semibold" style={{ color: "rgba(157,178,195,.55)" }}>{s.n}</span>
              </div>
              <div className="mt-[18px] text-[16px] font-semibold text-white">{s.title}</div>
              <p className="mt-2 text-[13.5px] leading-[1.6] text-muted">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefícios */}
      <section id="beneficios" className="mx-auto max-w-[1140px] scroll-mt-[84px] px-6 pt-[110px]">
        <div className="max-w-[620px]">
          <SectionLabel>O que você conquista</SectionLabel>
          <h2 className="mt-4 font-semibold leading-[1.15] tracking-[-0.02em] text-white" style={{ fontSize: "clamp(26px,3.4vw,40px)", textWrap: "balance" }}>Resultado para quem vende — e controle para quem gere</h2>
        </div>
        <div className="mt-9 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          {[
            { t: "Para o vendedor", items: ["Nota e análise em minutos, a cada atendimento enviado.", "Missões práticas diárias — sempre um próximo passo claro.", "Evolução por 5 níveis, do improviso ao atendimento ideal."] },
            { t: "Para o gestor", items: ["A equipe inteira em um painel: quem enviou, quem travou, quem evoluiu.", "Notas por critério para treinar exatamente o que falta em cada um.", "Previsibilidade de resultado sem precisar cobrar um por um."] },
          ].map((b) => (
            <div key={b.t} className="relative overflow-hidden rounded-2xl p-7" style={cardStyle}>
              <span className="absolute left-0 top-0 bottom-0 w-[3px]" style={{ background: "linear-gradient(#0087f8,#00cbff)" }} />
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan">{b.t}</div>
              <div className="mt-5 flex flex-col gap-3.5">
                {b.items.map((it) => (
                  <div key={it} className="flex gap-3 text-[14.5px] leading-[1.6] text-white">
                    <Check />
                    <span>{it}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cases */}
      <section id="resultados" className="mx-auto max-w-[1140px] scroll-mt-[84px] px-6 pt-[110px]">
        <div className="mx-auto max-w-[700px] text-center">
          <SectionLabel>Cases de sucesso</SectionLabel>
          <h2 className="mt-4 font-semibold leading-[1.15] tracking-[-0.02em] text-white" style={{ fontSize: "clamp(26px,3.4vw,40px)", textWrap: "balance" }}>
            A Simplifica já ajudou centenas de empresas a transformar seus resultados comerciais.
          </h2>
        </div>
        <div className="mt-10 grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl p-px" style={{ background: "linear-gradient(160deg, rgba(0,135,248,.4), rgba(0,45,115,.5))" }}>
              <div className="flex h-[340px] items-center justify-center rounded-[15px] px-6 text-center" style={{ background: "#03112d" }}>
                <span className="text-[13px] text-muted">Depoimento {i}<br /><span className="text-[11.5px] text-[rgba(157,178,195,.6)]">(print em breve)</span></span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link href="/login" className="inline-flex items-center gap-2.5 rounded-xl px-[26px] py-[13px] text-[14px] font-semibold text-white transition hover:-translate-y-0.5" style={btnPrimaryStyle}>Quero ser o próximo →</Link>
        </div>
      </section>

      {/* Quem somos */}
      <section id="quem-somos" className="mx-auto max-w-[1140px] scroll-mt-[84px] px-6 pt-[110px]">
        <div className="grid items-center gap-11" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
          <div>
            <SectionLabel>Sobre a Simplifica</SectionLabel>
            <h2 className="mt-4 font-semibold leading-[1.15] tracking-[-0.02em] text-white" style={{ fontSize: "clamp(26px,3.4vw,40px)" }}>Quem somos nós</h2>
            <p className="mt-5 text-[15px] leading-[1.7] text-muted">
              Já ajudamos <strong className="text-white">centenas de empresas a estruturarem seus processos comerciais</strong> — e vimos, na prática, o que realmente gera previsibilidade e o que é pura perda de tempo.
            </p>
            <p className="mt-4 text-[15px] leading-[1.7] text-muted">
              Hoje lideramos uma <strong className="text-white">aceleradora de negócios</strong> que conecta método, tecnologia e acompanhamento real. A Sales Academy é esse método transformado em treino diário para o seu time: um passo a passo comprovado para vender com clareza, processo e constância.
            </p>
            <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="mt-7 inline-flex items-center gap-2.5 rounded-xl border border-[rgba(0,45,115,.65)] bg-card-alt px-6 py-[13px] text-[14px] font-semibold text-white transition hover:border-[rgba(0,135,248,.6)]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00cbff" strokeWidth="1.8"><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.6L4 20l1-4.4A8.5 8.5 0 1 1 21 11.5z" /></svg>
              Falar com um especialista agora
            </a>
          </div>
          <div className="rounded-[18px] p-px" style={{ background: "linear-gradient(160deg, rgba(0,135,248,.45), rgba(0,45,115,.5) 40%, rgba(0,203,255,.25))" }}>
            <div className="flex h-[420px] items-center justify-center rounded-[17px] text-center" style={{ background: "#03112d" }}>
              <span className="text-[13px] text-muted">Foto do time Simplifica<br /><span className="text-[11.5px] text-[rgba(157,178,195,.6)]">(em breve)</span></span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-[1140px] px-6 pb-[90px] pt-[110px]">
        <div className="rounded-[20px] p-px" style={{ background: "linear-gradient(120deg, rgba(0,135,248,.6), rgba(0,203,255,.35), rgba(0,45,115,.45))" }}>
          <div className="rounded-[19px] px-7 text-center" style={{ padding: "clamp(36px,6vw,64px) 28px", background: "radial-gradient(700px 300px at 50% -20%, rgba(0,135,248,.18), transparent 70%), linear-gradient(100deg, #00173d, #03112d)" }}>
            <h2 className="mx-auto max-w-[640px] font-semibold leading-[1.15] tracking-[-0.02em] text-white" style={{ fontSize: "clamp(26px,3.6vw,42px)", textWrap: "balance" }}>Pronto para colocar seu comercial em outro nível?</h2>
            <p className="mx-auto mt-4 max-w-[520px] text-[15px] leading-[1.65] text-muted">
              Para garantir acompanhamento de qualidade, atendemos <strong className="text-cyan">apenas 10 empresas por ciclo</strong>. Se houver vaga agora, não perca tempo.
            </p>
            <div className="mt-[30px] flex flex-wrap justify-center gap-3">
              <Link href="/login" className="inline-flex items-center gap-2.5 rounded-xl px-[30px] py-[15px] text-[15px] font-semibold text-white transition hover:-translate-y-0.5" style={{ background: "linear-gradient(135deg,#0052b9,#0087f8)", boxShadow: "0 12px 34px rgba(0,135,248,.38)" }}>Começar meu treinamento de 30 dias →</Link>
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2.5 rounded-xl border border-[rgba(0,45,115,.65)] px-[30px] py-[15px] text-[15px] font-semibold text-white transition hover:border-[rgba(0,135,248,.6)]" style={{ background: "rgba(0,4,20,.85)" }}>Agendar diagnóstico</a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[rgba(0,45,115,.45)]" style={{ background: "rgba(2,13,35,.72)" }}>
        <div className="mx-auto grid max-w-[1140px] gap-9 px-6 pb-7 pt-[52px]" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <div>
            <Image src="/logo.png" alt="Simplifica" width={150} height={40} style={{ width: 150, height: "auto" }} />
            <p className="mt-3.5 max-w-[280px] text-[13px] leading-[1.6] text-muted">Aceleradora de negócios: método, tecnologia e acompanhamento real para o seu comercial.</p>
          </div>
          <div>
            <div className="mb-3.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white">Contato</div>
            <div className="flex flex-col gap-2.5">
              <a href={INSTAGRAM} target="_blank" rel="noopener noreferrer" className="text-[13.5px] text-muted transition hover:text-cyan">Instagram</a>
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="text-[13.5px] text-muted transition hover:text-cyan">WhatsApp</a>
              <a href={YOUTUBE} target="_blank" rel="noopener noreferrer" className="text-[13.5px] text-muted transition hover:text-cyan">YouTube</a>
            </div>
          </div>
          <div>
            <div className="mb-3.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white">Políticas</div>
            <div className="flex flex-col gap-2.5">
              <a href="#" className="text-[13.5px] text-muted transition hover:text-cyan">Políticas de Privacidade</a>
              <a href="#" className="text-[13.5px] text-muted transition hover:text-cyan">Termos de Uso</a>
            </div>
          </div>
          <div>
            <div className="mb-3.5 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-white">Plataforma</div>
            <div className="flex flex-col gap-2.5">
              <Link href="/login" className="text-[13.5px] text-muted transition hover:text-cyan">Entrar na Sales Academy</Link>
              <a href="#metodo" className="text-[13.5px] text-muted transition hover:text-cyan">Como funciona</a>
            </div>
          </div>
        </div>
        <div className="border-t border-[rgba(0,45,115,.35)]">
          <div className="mx-auto flex max-w-[1140px] flex-wrap items-center justify-between gap-3 px-6 py-[18px]">
            <span className="text-[11.5px] text-[rgba(157,178,195,.7)]">Simplifica MKT Digital 2026© Todos os direitos reservados</span>
            <span className="text-[11.5px] text-[rgba(157,178,195,.7)]">simplificaaceleradora.com.br</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
