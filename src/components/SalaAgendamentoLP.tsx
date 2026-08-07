"use client";

import { useEffect } from "react";

/**
 * Landing page "Sala do Agendamento".
 *
 * O HTML é o arquivo entregue pelo time de design, preservado como veio —
 * injetado em vez de reescrito em JSX, para o layout aprovado não mudar em
 * nada. Aqui só trocamos os caminhos dos assets e os destinos dos botões:
 *   · comprar (individual) -> /checkout  (login, checagem e Stripe)
 *   · equipe (empresarial) -> WhatsApp do comercial
 *
 * Gerado por scratchpad/gerar-lp.mjs a partir do index.html original. Ao
 * receber uma LP nova, rode o script de novo em vez de editar este arquivo.
 */

// O botão do plano empresarial já vem com o WhatsApp do comercial no
// próprio HTML da landing — nada a substituir aqui.

const CSS = `
  *{box-sizing:border-box;}
  body{margin:0;background:#fff;font-family:'Inter',sans-serif;color:#12151C;}
  a{color:#2F6FE8;text-decoration:none;}
  a:hover{color:#1E56C4;}
  ::selection{background:#2F6FE8;color:#fff;}
  @keyframes marqueeScroll{0%{transform:translateX(0);}100%{transform:translateX(-50%);}}
  .platform-carousel::-webkit-scrollbar{display:none;}
  .hero-desktop{display:block;}
  .hero-mobile{display:none;}
  @media (max-width:768px){
    .hero-desktop{display:none;}
    .hero-mobile{display:block;}
    .cta-center-mobile{display:block !important;width:fit-content;margin:0 auto;}
  }
  @media (max-width:640px){
    .ai-marquee-text{font-size:12px !important;}
    .ai-marquee-item{padding:0 16px !important;}
    .problem-chip{font-size:14px !important;padding:11px 16px !important;}
  }
  @media (max-width:480px){
    .header-cta{font-size:12px !important;padding:9px 14px !important;}
  }
  .cta-primary:hover{background:#1E56C4 !important;}
  .cta-light:hover{background:#E4E8F0 !important;}
`;

const HTML = `

<div style="background:#fff;color:#12151C;">

  <!-- HEADER -->
  <div style="position:sticky;top:0;z-index:50;background:rgba(8,13,26,0.92);backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,0.08);">
    <div style="max-width:1200px;margin:0 auto;padding:16px clamp(16px,4vw,32px);display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;">
      <div style="display:flex;align-items:center;gap:10px;">
        <img src="/lp/assets/simplifica-icon-blue.png" alt="" style="width:26px;height:26px;object-fit:contain;">
        <div style="display:flex;flex-direction:column;line-height:1.1;">
          <span style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:16px;color:#fff;letter-spacing:0.2px;">Sala do Agendamento</span>
          <span style="font-size:11px;color:#8A94AD;font-weight:500;">um programa Simplifica</span>
        </div>
      </div>
      <a href="#planos" class="cta-primary header-cta" style="background:#2F6FE8;color:#fff;font-weight:700;font-size:13px;padding:11px 20px;border-radius:8px;white-space:nowrap;">GARANTIR MINHA CADEIRA</a>
    </div>
  </div>

  <!-- HERO DESKTOP -->
  <div class="hero-desktop" style="position:relative;min-height:clamp(520px,90vh,760px);align-items:center;overflow:hidden;">
    <img src="/lp/assets/hero-video-call.png" alt="Mentoria ao vivo por videochamada" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">
    <div style="position:absolute;inset:0;background:linear-gradient(100deg,rgba(4,7,14,0.92) 0%,rgba(5,9,18,0.88) 20%,rgba(6,10,20,0.78) 35%,rgba(6,10,20,0.55) 48%,rgba(6,10,20,0.32) 58%,rgba(6,10,20,0.12) 68%,rgba(6,10,20,0) 80%);"></div>
    <div style="position:relative;max-width:1200px;margin:0 auto;padding:clamp(48px,10vw,96px) clamp(20px,5vw,32px);width:100%;">
      <div style="max-width:520px;">
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px;">
          <div style="display:inline-block;background:rgba(47,111,232,0.18);border:1px solid rgba(47,111,232,0.4);color:#9FC0F8;font-size:12px;font-weight:700;letter-spacing:1.2px;padding:7px 14px;border-radius:999px;">MENTORIA AO VIVO PARA VENDEDORES</div>
        </div>
        <h1 style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:clamp(32px,7vw,52px);line-height:1.1;color:#fff;margin:0 0 22px;text-wrap:pretty;">Sala do Agendamento</h1>
        <p style="font-size:19px;line-height:1.6;color:#E4E9F5;margin:0 0 30px;text-wrap:pretty;">Mentoria em grupo ao vivo de ligações e WhatsApp, com prática, avaliação e acompanhamento para transformar conversas em agendamentos.</p>
        <a href="#planos" class="cta-primary" style="display:inline-block;background:#2F6FE8;color:#fff;font-weight:800;font-size:15px;padding:18px 32px;border-radius:10px;box-shadow:0 12px 32px rgba(47,111,232,0.35);">GARANTIR MINHA CADEIRA POR R$147</a>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px 28px;margin-top:32px;">
          <div style="display:flex;align-items:center;gap:8px;color:#E4E9F5;font-size:14px;font-weight:500;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="#2F6FE8" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>Toda quinta-feira</div>
          <div style="display:flex;align-items:center;gap:8px;color:#E4E9F5;font-size:14px;font-weight:500;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="#2F6FE8" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>Às 19h</div>
          <div style="display:flex;align-items:center;gap:8px;color:#E4E9F5;font-size:14px;font-weight:500;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="#2F6FE8" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>Treine situações reais</div>
          <div style="display:flex;align-items:center;gap:8px;color:#E4E9F5;font-size:14px;font-weight:500;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="#2F6FE8" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>Receba correções</div>
          <div style="display:flex;align-items:center;gap:8px;color:#E4E9F5;font-size:14px;font-weight:500;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="#2F6FE8" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>Acompanhe sua evolução</div>
          <div style="display:flex;align-items:center;gap:8px;color:#E4E9F5;font-size:14px;font-weight:500;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="#2F6FE8" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>Plataforma própria</div>
        </div>
      </div>
    </div>
  </div>

  <!-- HERO MOBILE -->
  <div class="hero-mobile" style="background:#0B1220;padding:clamp(40px,10vw,64px) clamp(20px,5vw,32px) 0;">
    <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px;">
      <div style="display:inline-block;background:rgba(47,111,232,0.18);border:1px solid rgba(47,111,232,0.4);color:#9FC0F8;font-size:12px;font-weight:700;letter-spacing:1.2px;padding:7px 14px;border-radius:999px;">MENTORIA AO VIVO PARA VENDEDORES</div>
    </div>
    <h1 style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:clamp(32px,7vw,44px);line-height:1.1;color:#fff;margin:0 0 22px;text-wrap:pretty;">Sala do Agendamento</h1>
    <p style="font-size:18px;line-height:1.6;color:#E4E9F5;margin:0 0 30px;text-wrap:pretty;">Mentoria em grupo ao vivo de ligações e WhatsApp, com prática, avaliação e acompanhamento para transformar conversas em agendamentos.</p>
    <a href="#planos" class="cta-primary" style="display:inline-block;background:#2F6FE8;color:#fff;font-weight:800;font-size:15px;padding:18px 32px;border-radius:10px;box-shadow:0 12px 32px rgba(47,111,232,0.35);">GARANTIR MINHA CADEIRA POR R$147</a>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:28px;">
      <div style="display:flex;align-items:center;gap:8px;color:#E4E9F5;font-size:14px;font-weight:500;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="#2F6FE8" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>Toda quinta-feira</div>
      <div style="display:flex;align-items:center;gap:8px;color:#E4E9F5;font-size:14px;font-weight:500;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="#2F6FE8" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>Às 19h</div>
      <div style="display:flex;align-items:center;gap:8px;color:#E4E9F5;font-size:14px;font-weight:500;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="#2F6FE8" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>Treine situações reais</div>
      <div style="display:flex;align-items:center;gap:8px;color:#E4E9F5;font-size:14px;font-weight:500;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="#2F6FE8" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>Receba correções</div>
      <div style="display:flex;align-items:center;gap:8px;color:#E4E9F5;font-size:14px;font-weight:500;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="#2F6FE8" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>Acompanhe sua evolução</div>
      <div style="display:flex;align-items:center;gap:8px;color:#E4E9F5;font-size:14px;font-weight:500;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="11" stroke="#2F6FE8" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg>Plataforma própria</div>
    </div>
    <div style="position:relative;margin-top:24px;">
      <img src="/lp/assets/hero-video-call-mobile.png" alt="Mentoria ao vivo por videochamada" style="width:100%;border-radius:20px;display:block;">
      <div style="position:absolute;top:0;left:0;right:0;height:50px;background:linear-gradient(180deg,#0B1220 0%,rgba(11,18,32,0) 100%);border-radius:20px 20px 0 0;"></div>
    </div>
  </div>

  <!-- AI BANNER -->
  <div style="background:#FFD400;padding:10px 0;overflow:hidden;white-space:nowrap;">
    <div id="marqueeTrack" style="display:inline-flex;animation:marqueeScroll 55s linear infinite;"><span class="ai-marquee-item" style="display:inline-flex;align-items:center;gap:10px;padding:0 28px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#0B1220;flex-shrink:0;"><span style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:11px;color:#FFD400;letter-spacing:0.3px;">IA</span></span><span class="ai-marquee-text" style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:15px;color:#0B1220;letter-spacing:0.2px;">+ Prática + Feedback</span></span><span class="ai-marquee-item" style="display:inline-flex;align-items:center;gap:10px;padding:0 28px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#0B1220;flex-shrink:0;"><span style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:11px;color:#FFD400;letter-spacing:0.3px;">IA</span></span><span class="ai-marquee-text" style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:15px;color:#0B1220;letter-spacing:0.2px;">+ Prática + Feedback</span></span><span class="ai-marquee-item" style="display:inline-flex;align-items:center;gap:10px;padding:0 28px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#0B1220;flex-shrink:0;"><span style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:11px;color:#FFD400;letter-spacing:0.3px;">IA</span></span><span class="ai-marquee-text" style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:15px;color:#0B1220;letter-spacing:0.2px;">+ Prática + Feedback</span></span><span class="ai-marquee-item" style="display:inline-flex;align-items:center;gap:10px;padding:0 28px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#0B1220;flex-shrink:0;"><span style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:11px;color:#FFD400;letter-spacing:0.3px;">IA</span></span><span class="ai-marquee-text" style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:15px;color:#0B1220;letter-spacing:0.2px;">+ Prática + Feedback</span></span><span class="ai-marquee-item" style="display:inline-flex;align-items:center;gap:10px;padding:0 28px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#0B1220;flex-shrink:0;"><span style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:11px;color:#FFD400;letter-spacing:0.3px;">IA</span></span><span class="ai-marquee-text" style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:15px;color:#0B1220;letter-spacing:0.2px;">+ Prática + Feedback</span></span><span class="ai-marquee-item" style="display:inline-flex;align-items:center;gap:10px;padding:0 28px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#0B1220;flex-shrink:0;"><span style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:11px;color:#FFD400;letter-spacing:0.3px;">IA</span></span><span class="ai-marquee-text" style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:15px;color:#0B1220;letter-spacing:0.2px;">+ Prática + Feedback</span></span><span class="ai-marquee-item" style="display:inline-flex;align-items:center;gap:10px;padding:0 28px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#0B1220;flex-shrink:0;"><span style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:11px;color:#FFD400;letter-spacing:0.3px;">IA</span></span><span class="ai-marquee-text" style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:15px;color:#0B1220;letter-spacing:0.2px;">+ Prática + Feedback</span></span><span class="ai-marquee-item" style="display:inline-flex;align-items:center;gap:10px;padding:0 28px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#0B1220;flex-shrink:0;"><span style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:11px;color:#FFD400;letter-spacing:0.3px;">IA</span></span><span class="ai-marquee-text" style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:15px;color:#0B1220;letter-spacing:0.2px;">+ Prática + Feedback</span></span><span class="ai-marquee-item" style="display:inline-flex;align-items:center;gap:10px;padding:0 28px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#0B1220;flex-shrink:0;"><span style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:11px;color:#FFD400;letter-spacing:0.3px;">IA</span></span><span class="ai-marquee-text" style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:15px;color:#0B1220;letter-spacing:0.2px;">+ Prática + Feedback</span></span><span class="ai-marquee-item" style="display:inline-flex;align-items:center;gap:10px;padding:0 28px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#0B1220;flex-shrink:0;"><span style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:11px;color:#FFD400;letter-spacing:0.3px;">IA</span></span><span class="ai-marquee-text" style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:15px;color:#0B1220;letter-spacing:0.2px;">+ Prática + Feedback</span></span><span class="ai-marquee-item" style="display:inline-flex;align-items:center;gap:10px;padding:0 28px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#0B1220;flex-shrink:0;"><span style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:11px;color:#FFD400;letter-spacing:0.3px;">IA</span></span><span class="ai-marquee-text" style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:15px;color:#0B1220;letter-spacing:0.2px;">+ Prática + Feedback</span></span><span class="ai-marquee-item" style="display:inline-flex;align-items:center;gap:10px;padding:0 28px;"><span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;background:#0B1220;flex-shrink:0;"><span style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:11px;color:#FFD400;letter-spacing:0.3px;">IA</span></span><span class="ai-marquee-text" style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:15px;color:#0B1220;letter-spacing:0.2px;">+ Prática + Feedback</span></span></div>
  </div>
  <div style="height:40px;background:#fff;"></div>

  <!-- PROBLEM -->
  <div style="background:#fff;padding:clamp(56px,10vw,96px) clamp(20px,5vw,32px);">
    <div style="max-width:900px;margin:0 auto;text-align:center;">
      <h2 style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:clamp(28px,5.5vw,38px);line-height:1.15;color:#12151C;margin:0 0 22px;text-wrap:pretty;">O LEAD respondeu. Mas você conseguiu agendar?</h2>
      <p style="font-size:17px;line-height:1.7;color:#4B5568;margin:0 0 32px;text-wrap:pretty;">Muitos vendedores sabem apresentar o produto, informar o preço e responder dúvidas. O problema aparece quando precisam conduzir a conversa até o próximo passo.</p>
      <div style="display:flex;flex-wrap:wrap;gap:12px;margin-bottom:36px;justify-content:center;">
        <div class="problem-chip" style="display:inline-block;border:1px solid #E4E8F0;border-radius:12px;padding:14px 22px;font-size:16px;color:#FFFFFF;line-height:1.4;cursor:default;background-color:#2F6FE8;">O lead diz que vai verificar.</div>
        <div class="problem-chip" style="display:inline-block;border:1px solid #E4E8F0;border-radius:12px;padding:14px 22px;font-size:16px;color:#FFFFFF;line-height:1.4;cursor:default;background-color:#2F6FE8;">Pede para chamar depois.</div>
        <div class="problem-chip" style="display:inline-block;border:1px solid #E4E8F0;border-radius:12px;padding:14px 22px;font-size:16px;color:#FFFFFF;line-height:1.4;cursor:default;background-color:#2F6FE8;">Pergunta o preço e desaparece.</div>
        <div class="problem-chip" style="display:inline-block;border:1px solid #E4E8F0;border-radius:12px;padding:14px 22px;font-size:16px;color:#FFFFFF;line-height:1.4;cursor:default;background-color:#2F6FE8;">Visualiza a mensagem e não responde.</div>
        <div class="problem-chip" style="display:inline-block;border:1px solid #E4E8F0;border-radius:12px;padding:14px 22px;font-size:16px;color:#FFFFFF;line-height:1.4;cursor:default;background-color:#2F6FE8;">Atende a ligação, mas não aceita marcar um compromisso.</div>
      </div>
      <p style="font-size:17px;line-height:1.7;color:#4B5568;margin:0 0 36px;text-wrap:pretty;">Na Sala do Agendamento, você aprende o que falar, como conduzir e como recuperar conversas que normalmente seriam perdidas.</p>
      <div class="quote-box" data-base-size="19" style="background:#F0F5FF;border-left:3px solid #2F6FE8;border-radius:10px;padding:26px 12px;margin-bottom:36px;text-align:center;overflow-x:hidden;width:100%;box-sizing:border-box;">
        <p class="quote-text" style="font-size:19px;line-height:1.6;color:#12151C;font-weight:600;margin:0;white-space:nowrap;display:inline-block;">"Você não precisa apenas conversar com o lead. Precisa saber conduzi-lo até o agendamento."</p>
      </div>
      <a href="#planos" class="cta-primary" style="display:inline-block;background:#2F6FE8;color:#fff;font-weight:800;font-size:15px;padding:16px 28px;border-radius:10px;">QUERO APRENDER A AGENDAR MAIS</a>
    </div>
  </div>

  <!-- HOW IT WORKS -->
  <div style="background:#0B1220;padding:clamp(56px,10vw,96px) clamp(20px,5vw,32px);">
    <div style="max-width:1200px;margin:0 auto;">
      <div style="max-width:700px;">
        <div style="color:#7CA8F4;font-size:12px;font-weight:700;letter-spacing:1.2px;margin-bottom:14px;">COMO FUNCIONAM OS TREINAMENTOS</div>
        <h2 style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:clamp(28px,5.5vw,38px);line-height:1.15;color:#fff;margin:0 0 20px;text-wrap:pretty;">Aqui você não fica apenas assistindo</h2>
        <p style="font-size:17px;line-height:1.7;color:#8A94AD;margin:0 0 56px;text-wrap:pretty;">A Sala do Agendamento não é um curso gravado. É um ambiente de treinamento semanal, no qual você pratica, recebe correções e aprende a aplicar a metodologia em situações reais.</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:24px;margin-bottom:48px;">
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px 24px;">
          <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:28px;font-weight:800;color:#2F6FE8;margin-bottom:16px;">01</div>
          <h3 style="font-size:17px;font-weight:700;color:#fff;margin:0 0 10px;">Treinamento ao vivo</h3>
          <p style="font-size:14px;line-height:1.6;color:#8A94AD;margin:0;">Toda quinta-feira, às 19h, trabalhamos técnicas de ligação, abordagem pelo WhatsApp, condução da conversa, objeções e follow-up.</p>
        </div>
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px 24px;">
          <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:28px;font-weight:800;color:#2F6FE8;margin-bottom:16px;">02</div>
          <h3 style="font-size:17px;font-weight:700;color:#fff;margin:0 0 10px;">Roleplays</h3>
          <p style="font-size:14px;line-height:1.6;color:#8A94AD;margin:0;">Você participa de simulações de atendimento e aprende como reagir às principais respostas e objeções dos leads na prática.</p>
        </div>
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px 24px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
            <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:28px;font-weight:800;color:#2F6FE8;">03</div>
            <div style="background:rgba(47,111,232,0.15);color:#7CA8F4;font-size:10.5px;font-weight:800;letter-spacing:0.6px;padding:4px 9px;border-radius:999px;">IA SIMPLIFICA</div>
          </div>
          <h3 style="font-size:17px;font-weight:700;color:#fff;margin:0 0 10px;">Avaliação por IA especializada</h3>
          <p style="font-size:14px;line-height:1.6;color:#8A94AD;margin:0;">Suas ligações, áudios e conversas são analisados por uma inteligência artificial treinada pela Simplifica, que identifica o que funcionou e o que precisa ser corrigido.</p>
        </div>
        <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:28px 24px;">
          <div style="font-family:'Plus Jakarta Sans',sans-serif;font-size:28px;font-weight:800;color:#2F6FE8;margin-bottom:16px;">04</div>
          <h3 style="font-size:17px;font-weight:700;color:#fff;margin:0 0 10px;">Aplicação prática</h3>
          <p style="font-size:14px;line-height:1.6;color:#8A94AD;margin:0;">Você sai de cada encontro sabendo exatamente o que precisa ajustar nas próximas conversas.</p>
        </div>
      </div>
      <div class="quote-box" data-base-size="18" style="background:rgba(47,111,232,0.1);border:1px solid rgba(47,111,232,0.3);border-radius:10px;padding:26px 12px;max-width:700px;margin:0 auto;text-align:center;overflow-x:hidden;box-sizing:border-box;">
        <p class="quote-text" style="font-size:18px;line-height:1.6;color:#fff;font-weight:600;margin:0;white-space:nowrap;display:inline-block;">"Você aprende, pratica, aplica e volta na semana seguinte com uma nova evolução."</p>
      </div>
    </div>
  </div>

  <!-- PLATFORM -->
  <div style="background:#fff;padding:clamp(56px,10vw,96px) clamp(20px,5vw,32px);">
    <div style="max-width:900px;margin:0 auto;text-align:center;">
      <div>
        <div style="color:#2F6FE8;font-size:12px;font-weight:700;letter-spacing:1.2px;margin-bottom:14px;">PLATAFORMA COM IA DA SIMPLIFICA</div>
        <h2 style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:clamp(26px,5vw,34px);line-height:1.18;color:#12151C;margin:0 0 20px;text-wrap:pretty;">Uma <span style="display:inline-flex;align-items:center;justify-content:center;background:#0B1220;color:#FFD400;border-radius:6px;padding:2px 10px;">IA</span> treinada com a metodologia que avalia seu atendimento.</h2>
        <p style="font-size:16px;line-height:1.7;color:#4B5568;margin:0 0 30px;text-wrap:pretty;">Além da mentoria ao vivo, você terá acesso a uma plataforma própria, com uma inteligência artificial treinada pela Simplifica para avaliar como você está aplicando a metodologia no dia a dia. Dentro da plataforma, você poderá:</p>
        <div style="display:flex;flex-direction:column;gap:18px;margin-bottom:30px;text-align:left;max-width:560px;margin-left:auto;margin-right:auto;">
          <div style="display:flex;gap:14px;align-items:flex-start;">
            <div style="width:34px;height:34px;border-radius:9px;background:rgba(47,111,232,0.1);flex-shrink:0;display:flex;align-items:center;justify-content:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18V5l12-2v13" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="6" cy="18" r="3" stroke="#2F6FE8" stroke-width="2"></circle><circle cx="18" cy="16" r="3" stroke="#2F6FE8" stroke-width="2"></circle></svg></div>
            <span style="font-size:15.5px;color:#2B2F3A;line-height:1.6;padding-top:6px;">Enviar áudios e gravações de ligações</span>
          </div>
          <div style="display:flex;gap:14px;align-items:flex-start;">
            <div style="width:34px;height:34px;border-radius:9px;background:rgba(47,111,232,0.1);flex-shrink:0;display:flex;align-items:center;justify-content:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" stroke="#2F6FE8" stroke-width="2" stroke-linejoin="round"></path></svg></div>
            <span style="font-size:15.5px;color:#2B2F3A;line-height:1.6;padding-top:6px;">Enviar conversas realizadas pelo WhatsApp</span>
          </div>
          <div style="display:flex;gap:14px;align-items:center;">
            <div style="width:34px;height:34px;border-radius:9px;background:rgba(47,111,232,0.1);flex-shrink:0;display:flex;align-items:center;justify-content:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 20V10M18 20V4M6 20v-4" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round"></path></svg></div>
            <span style="font-size:15.5px;color:#2B2F3A;line-height:1.6;">Receber uma nota gerada pela IA da Simplifica, com base na metodologia</span>
          </div>
          <div style="display:flex;gap:14px;align-items:flex-start;">
            <div style="width:34px;height:34px;border-radius:9px;background:rgba(47,111,232,0.1);flex-shrink:0;display:flex;align-items:center;justify-content:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#2F6FE8" stroke-width="2"></circle><path d="M21 21l-4.3-4.3" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round"></path></svg></div>
            <span style="font-size:15.5px;color:#2B2F3A;line-height:1.6;padding-top:6px;">Ter os pontos de melhoria identificados automaticamente pela IA</span>
          </div>
          <div style="display:flex;gap:14px;align-items:flex-start;">
            <div style="width:34px;height:34px;border-radius:9px;background:rgba(47,111,232,0.1);flex-shrink:0;display:flex;align-items:center;justify-content:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M3 17l6-6 4 4 8-8" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg></div>
            <span style="font-size:15.5px;color:#2B2F3A;line-height:1.6;padding-top:6px;">Acompanhar sua evolução ao longo dos treinamentos</span>
          </div>
        </div>
        <div style="background:#F0F5FF;border-left:3px solid #2F6FE8;border-radius:10px;padding:22px 26px;margin-bottom:30px;max-width:560px;margin-left:auto;margin-right:auto;">
          <p style="font-size:16.5px;line-height:1.6;color:#12151C;font-weight:600;margin:0;text-wrap:pretty;">"Treine na quinta-feira. Aplique durante a semana. Avalie seu desempenho todos os dias."</p>
        </div>
        <a href="#planos" class="cta-primary" style="display:inline-block;background:#2F6FE8;color:#fff;font-weight:800;font-size:15px;padding:16px 28px;border-radius:10px;margin-bottom:48px;">QUERO ACESSAR A PLATAFORMA</a>
      </div>
      <div style="display:flex;justify-content:center;">
        <video src="/lp/assets/platform-demo.mp4" controls playsinline preload="metadata" style="width:100%;max-width:900px;border-radius:20px;box-shadow:0 20px 50px rgba(0,0,0,0.18);display:block;background:#0B1220;"></video>
      </div>
    </div>
  </div>

  <!-- SELLERS AND MANAGERS -->
  <div style="background:#F4F6FA;padding:clamp(56px,10vw,96px) clamp(20px,5vw,32px);">
    <div style="max-width:1200px;margin:0 auto;">
      <div style="max-width:700px;margin:0 auto 56px;text-align:center;">
        <div style="color:#2F6FE8;font-size:12px;font-weight:700;letter-spacing:1.2px;margin-bottom:14px;">PARA VENDEDORES E GESTORES</div>
        <h2 style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:clamp(26px,5vw,36px);line-height:1.18;color:#12151C;margin:0 0 20px;text-wrap:pretty;">Você evolui. Seu gestor acompanha.</h2>
        <p style="font-size:16px;line-height:1.7;color:#4B5568;margin:0;text-wrap:pretty;">A Sala do Agendamento foi criada para vendedores que querem melhorar seus resultados e para gestores que precisam desenvolver suas equipes.</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px;margin-bottom:40px;">
        <div style="border:1px solid #E4E8F0;border-radius:16px;padding:36px;background-color:#fff;">
          <div style="display:inline-block;border-radius:8px;padding:8px 14px;margin-bottom:14px;background-color:#2F6FE8;"><h3 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:800;color:#FFFFFF;margin:0;">Para o vendedor</h3></div>
          <p style="font-size:15.5px;line-height:1.7;color:#4B5568;margin:0;text-wrap:pretty;">Uma inteligência artificial treinada pela Simplifica analisa suas ligações e conversas, mostra onde você está errando e aponta orientações práticas para você acompanhar sua própria evolução com mais segurança, clareza e intenção.</p>
        </div>
        <div style="border:1px solid #E4E8F0;border-radius:16px;padding:36px;background-color:#0B1220;">
          <div style="display:inline-block;border-radius:8px;padding:8px 14px;margin-bottom:14px;background-color:#2F6FE8;"><h3 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:800;color:#FFFFFF;margin:0;">Para o gestor</h3></div>
          <p style="font-size:15.5px;line-height:1.7;color:#C7CEE0;margin:0;text-wrap:pretty;">O gestor pode ter um acesso separado para acompanhar o desenvolvimento dos vendedores, com notas e diagnósticos gerados pela IA da Simplifica, que aponta as dificuldades e os pontos que precisam ser trabalhados com cada profissional.</p>
        </div>
      </div>
      <div style="background:#0B1220;border-radius:10px;padding:26px 30px;margin-bottom:40px;max-width:800px;margin-left:auto;margin-right:auto;">
        <p style="font-size:17px;line-height:1.6;color:#fff;font-weight:600;margin:0;text-align:center;text-wrap:pretty;">"O vendedor deixa de depender apenas da própria percepção, e o gestor passa a acompanhar a evolução com dados."</p>
      </div>
      <div style="text-align:center;">
        <p style="font-size:14px;font-weight:700;color:#4B5568;margin:0 0 16px;letter-spacing:0.3px;">INDICADO PARA EQUIPES E PROFISSIONAIS QUE PRECISAM AGENDAR</p>
        <div style="display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-bottom:36px;">
          <span style="background:#fff;border:1px solid #E4E8F0;border-radius:999px;padding:9px 18px;font-size:14px;font-weight:600;color:#2B2F3A;">Consultas</span>
          <span style="background:#fff;border:1px solid #E4E8F0;border-radius:999px;padding:9px 18px;font-size:14px;font-weight:600;color:#2B2F3A;">Avaliações</span>
          <span style="background:#fff;border:1px solid #E4E8F0;border-radius:999px;padding:9px 18px;font-size:14px;font-weight:600;color:#2B2F3A;">Reuniões</span>
          <span style="background:#fff;border:1px solid #E4E8F0;border-radius:999px;padding:9px 18px;font-size:14px;font-weight:600;color:#2B2F3A;">Visitas</span>
          <span style="background:#fff;border:1px solid #E4E8F0;border-radius:999px;padding:9px 18px;font-size:14px;font-weight:600;color:#2B2F3A;">Apresentações</span>
          <span style="background:#fff;border:1px solid #E4E8F0;border-radius:999px;padding:9px 18px;font-size:14px;font-weight:600;color:#2B2F3A;">Demonstrações</span>
        </div>
        <div style="display:flex;flex-wrap:wrap;align-items:flex-start;gap:14px;justify-content:center;margin-bottom:36px;">
          <img src="/lp/assets/platform-a.jpeg" alt="Análise do atendimento" style="width:230px;max-width:100%;height:auto;flex-shrink:0;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);">
          <img src="/lp/assets/platform-b.jpeg" alt="Evolução das notas do vendedor" style="width:230px;max-width:100%;height:auto;flex-shrink:0;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);">
          <img src="/lp/assets/platform-c.jpeg" alt="Painel de treinamento comercial" style="width:230px;max-width:100%;height:auto;flex-shrink:0;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.12);">
        </div>
        <a href="#planos" class="cta-primary" style="display:inline-block;background:#2F6FE8;color:#fff;font-weight:800;font-size:15px;padding:16px 28px;border-radius:10px;">QUERO DESENVOLVER AGORA</a>
      </div>
    </div>
  </div>

  <!-- WHO LEADS -->
  <div style="background:#0B1220;padding:clamp(56px,10vw,96px) clamp(20px,5vw,32px);">
    <div style="max-width:1200px;margin:0 auto;">
      <div style="text-align:center;max-width:600px;margin:0 auto 56px;">
        <div style="color:#7CA8F4;font-size:12px;font-weight:700;letter-spacing:1.2px;margin-bottom:14px;">QUEM CONDUZ A SALA</div>
        <h2 style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:clamp(26px,5vw,36px);line-height:1.18;color:#fff;margin:0;text-wrap:pretty;">Quem vai conduzir seus treinamentos?</h2>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:56px;align-items:center;">
        <div style="position:relative;width:100%;max-width:560px;">
          <div style="position:absolute;inset:-14px;border:1px solid rgba(124,168,244,0.25);border-radius:26px;pointer-events:none;"></div>
          <img src="/lp/assets/thiago-silva.jpeg" alt="Thiago Silva" style="width:100%;height:clamp(320px,60vw,560px);border-radius:20px;object-fit:cover;display:block;box-shadow:0 30px 60px rgba(0,0,0,0.4);position:relative;">
        </div>
        <div>
          <h3 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:28px;font-weight:800;color:#fff;margin:0 0 8px;letter-spacing:-0.2px;">Thiago Silva</h3>
          <p style="font-size:14px;font-weight:600;color:#7CA8F4;margin:0 0 22px;">Fundador da Simplifica Aceleradora de Negócios</p>
          <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:26px;">
            <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:999px;padding:9px 16px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;"><path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2z" fill="#7CA8F4"></path></svg>
              <span style="font-size:13px;font-weight:600;color:#E4E9F5;">Especialista em Vendas e Estruturação Comercial</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:999px;padding:9px 16px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;"><path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2z" fill="#7CA8F4"></path></svg>
              <span style="font-size:13px;font-weight:600;color:#E4E9F5;">Atuação direta em Comercial e Marketing</span>
            </div>
            <div style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.1);border-radius:999px;padding:9px 16px;">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style="flex-shrink:0;"><path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5L12 2z" fill="#7CA8F4"></path></svg>
              <span style="font-size:13px;font-weight:600;color:#E4E9F5;">Criador da metodologia Sala do Agendamento</span>
            </div>
          </div>
          <div style="width:40px;height:2px;background:#2F6FE8;margin-bottom:22px;"></div>
          <p style="font-size:16px;line-height:1.75;color:#8A94AD;margin:0 0 18px;text-wrap:pretty;">Ao acompanhar operações de diferentes segmentos, Thiago identificou um problema recorrente: muitas empresas conseguem gerar oportunidades, mas seus vendedores não sabem conduzir os leads até uma reunião, visita ou avaliação.</p>
          <p style="font-size:16px;line-height:1.75;color:#8A94AD;margin:0 0 18px;text-wrap:pretty;">Foi a partir dessa realidade que nasceu a Sala do Agendamento: um ambiente criado para transformar experiências reais de vendas em treinamentos práticos, com análise de ligações, conversas pelo WhatsApp, roleplays, correções e acompanhamento contínuo.</p>
          <p style="font-size:17px;line-height:1.7;color:#fff;font-weight:600;margin:0 0 30px;text-wrap:pretty;">Aqui, você não aprende apenas uma técnica. Você treina para aplicá-la nas conversas que enfrenta todos os dias.</p>
          <a href="#planos" class="cta-primary cta-center-mobile" style="display:inline-block;background:#2F6FE8;color:#fff;font-weight:800;font-size:15px;padding:16px 28px;border-radius:10px;">QUERO TREINAR NA PRÁTICA</a>
        </div>
      </div>
    </div>
  </div>

  <!-- PRICING -->
  <div id="planos" style="background:#F4F6FA;padding:clamp(56px,10vw,96px) clamp(20px,5vw,32px);">
    <div style="max-width:1000px;margin:0 auto;">
      <div style="text-align:center;max-width:640px;margin:0 auto 56px;">
        <div style="color:#2F6FE8;font-size:12px;font-weight:700;letter-spacing:1.2px;margin-bottom:14px;">ESCOLHA COMO ENTRAR</div>
        <h2 style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:clamp(26px,5vw,36px);line-height:1.18;color:#12151C;margin:0 0 18px;text-wrap:pretty;">Entre para a Sala do Agendamento</h2>
        <p style="font-size:16px;line-height:1.7;color:#4B5568;margin:0;">Escolha a modalidade mais adequada para você ou para a sua equipe.</p>
      </div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:28px;">
        <div style="background:#fff;border:2px solid #2F6FE8;border-radius:20px;padding:40px;position:relative;display:flex;flex-direction:column;">
          <h3 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:800;color:#12151C;margin:0 0 4px;">Plano Individual</h3>
          <div style="display:flex;align-items:baseline;gap:6px;margin:16px 0 18px;">
            <span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:40px;font-weight:800;color:#12151C;">R$147</span>
            <span style="font-size:15px;color:#8A94AD;font-weight:600;">/mês</span>
          </div>
          <p style="font-size:14.5px;line-height:1.65;color:#4B5568;margin:0 0 26px;text-wrap:pretty;">Para vendedores, corretores, atendentes e profissionais que querem melhorar sua própria capacidade de transformar conversas em agendamentos.</p>
          <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:30px;flex-grow:1;">
            <div style="display:flex;gap:10px;align-items:flex-start;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-top:2px;flex-shrink:0;"><circle cx="12" cy="12" r="11" stroke="#2F6FE8" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg><span style="font-size:14.5px;color:#2B2F3A;">Encontro ao vivo toda quinta-feira, às 19h</span></div>
            <div style="display:flex;gap:10px;align-items:flex-start;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-top:2px;flex-shrink:0;"><circle cx="12" cy="12" r="11" stroke="#2F6FE8" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg><span style="font-size:14.5px;color:#2B2F3A;">Treinamentos de ligação e WhatsApp</span></div>
            <div style="display:flex;gap:10px;align-items:flex-start;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-top:2px;flex-shrink:0;"><circle cx="12" cy="12" r="11" stroke="#2F6FE8" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg><span style="font-size:14.5px;color:#2B2F3A;">Roleplays com situações reais</span></div>
            <div style="display:flex;gap:10px;align-items:flex-start;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-top:2px;flex-shrink:0;"><circle cx="12" cy="12" r="11" stroke="#2F6FE8" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg><span style="font-size:14.5px;color:#2B2F3A;">Avaliação de ligações, áudios e conversas por IA</span></div>
            <div style="display:flex;gap:10px;align-items:flex-start;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-top:2px;flex-shrink:0;"><circle cx="12" cy="12" r="11" stroke="#2F6FE8" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg><span style="font-size:14.5px;color:#2B2F3A;">Plataforma de acompanhamento</span></div>
            <div style="display:flex;gap:10px;align-items:flex-start;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-top:2px;flex-shrink:0;"><circle cx="12" cy="12" r="11" stroke="#2F6FE8" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#2F6FE8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg><span style="font-size:14.5px;color:#2B2F3A;">Notas geradas pela IA da Simplifica e histórico individual de evolução</span></div>
          </div>
          <a href="/checkout" class="cta-primary" style="display:block;text-align:center;background:#2F6FE8;color:#fff;font-weight:800;font-size:15px;padding:16px;border-radius:10px;margin-bottom:12px;">GARANTIR MINHA CADEIRA</a>
          <p style="font-size:12.5px;color:#8A94AD;text-align:center;margin:0;">Cancele quando quiser.</p>
        </div>
        <div style="background:#0B1220;border:1px solid #2F6FE8;border-radius:20px;padding:40px;position:relative;display:flex;flex-direction:column;">
          <div style="position:absolute;top:-14px;left:36px;color:#0B1220;font-size:11px;font-weight:800;letter-spacing:0.6px;padding:6px 14px;border-radius:999px;background-color:#FAE800;">VAGAS LIMITADAS</div>
          <h3 style="font-family:'Plus Jakarta Sans',sans-serif;font-size:20px;font-weight:800;color:#fff;margin:0 0 4px;">Plano Empresarial</h3>
          <div style="display:flex;align-items:baseline;gap:6px;margin:16px 0 18px;">
            <span style="font-size:15px;color:#8A94AD;font-weight:600;">A Partir de</span><span style="font-family:'Plus Jakarta Sans',sans-serif;font-size:40px;font-weight:800;color:#fff;">5 Profissionais</span>
          </div>
          <p style="font-size:14.5px;line-height:1.65;color:#8A94AD;margin:0 0 26px;text-wrap:pretty;">Para empresas que querem desenvolver seus vendedores e acompanhar a evolução de cada profissional.</p>
          <div style="display:flex;flex-direction:column;gap:12px;margin-bottom:30px;flex-grow:1;">
            <div style="display:flex;gap:10px;align-items:flex-start;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-top:2px;flex-shrink:0;"><circle cx="12" cy="12" r="11" stroke="#7CA8F4" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#7CA8F4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg><span style="font-size:14.5px;color:#C7CEE0;">Horários flexíveis</span></div>
            <div style="display:flex;gap:10px;align-items:flex-start;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-top:2px;flex-shrink:0;"><circle cx="12" cy="12" r="11" stroke="#7CA8F4" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#7CA8F4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg><span style="font-size:14.5px;color:#C7CEE0;">Treinamentos semanais para os vendedores</span></div>
            <div style="display:flex;gap:10px;align-items:flex-start;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-top:2px;flex-shrink:0;"><circle cx="12" cy="12" r="11" stroke="#7CA8F4" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#7CA8F4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg><span style="font-size:14.5px;color:#C7CEE0;">Avaliação por IA de ligações e conversas pelo WhatsApp</span></div>
            <div style="display:flex;gap:10px;align-items:flex-start;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-top:2px;flex-shrink:0;"><circle cx="12" cy="12" r="11" stroke="#7CA8F4" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#7CA8F4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg><span style="font-size:14.5px;color:#C7CEE0;">Acesso individual para cada participante</span></div>
            <div style="display:flex;gap:10px;align-items:flex-start;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-top:2px;flex-shrink:0;"><circle cx="12" cy="12" r="11" stroke="#7CA8F4" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#7CA8F4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg><span style="font-size:14.5px;color:#C7CEE0;">Notas geradas por IA e histórico de evolução por vendedor</span></div>
            <div style="display:flex;gap:10px;align-items:flex-start;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-top:2px;flex-shrink:0;"><circle cx="12" cy="12" r="11" stroke="#7CA8F4" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#7CA8F4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg><span style="font-size:14.5px;color:#C7CEE0;">Login exclusivo para o gestor</span></div>
            <div style="display:flex;gap:10px;align-items:flex-start;"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" style="margin-top:2px;flex-shrink:0;"><circle cx="12" cy="12" r="11" stroke="#7CA8F4" stroke-width="2"></circle><path d="M7 12.5l3 3 7-7" stroke="#7CA8F4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg><span style="font-size:14.5px;color:#C7CEE0;">Acompanhamento das principais dificuldades da equipe</span></div>
          </div>
          <a href="https://wa.me/5531973502678?text=Ol%C3%A1%2C%20quero%20mais%20informa%C3%A7%C3%B5es%20sobre%20o%20plano%20personalizado." target="_blank" class="cta-light" style="display:block;text-align:center;background:#fff;color:#0B1220;font-weight:800;font-size:15px;padding:16px;border-radius:10px;margin-bottom:12px;">QUERO TREINAR MINHA EQUIPE</a>
          <p style="font-size:12.5px;color:#8A94AD;text-align:center;margin:0;">Plano personalizado de acordo com o número de vendedores.</p>
        </div>
      </div>
    </div>
  </div>

  <!-- FINAL CLOSING -->
  <div style="background:linear-gradient(160deg,#0A1730 0%,#0B1220 100%);padding:clamp(56px,10vw,100px) clamp(20px,5vw,32px);text-align:center;">
    <div style="max-width:720px;margin:0 auto;">
      <p style="font-size:17px;line-height:1.6;color:#8A94AD;margin:0 0 8px;">Não é mais um curso para sua equipe assistir e deixar de lado.</p>
      <h2 style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:clamp(24px,5vw,34px);line-height:1.25;color:#fff;margin:0 0 30px;text-wrap:pretty;">É um ambiente contínuo de treinamento, prática e avaliação por IA que evolui junto com você.</h2>
      <p style="font-size:19px;line-height:1.6;color:#C7CEE0;margin:0 0 40px;text-wrap:pretty;">Pare de perder conversas que poderiam terminar em agendamentos.</p>
      <a href="#planos" class="cta-primary" style="display:inline-block;background:#2F6FE8;color:#fff;font-weight:800;font-size:16px;padding:20px 36px;border-radius:10px;box-shadow:0 12px 32px rgba(47,111,232,0.35);">ENTRAR PARA A SALA DO AGENDAMENTO</a>
    </div>
  </div>

  <!-- FOOTER -->
  <div style="background:#060911;padding:56px clamp(20px,5vw,32px) 32px;">
    <div style="max-width:1200px;margin:0 auto;">
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:32px;margin-bottom:40px;">
        <div>
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;">
            <img src="/lp/assets/simplifica-icon-blue.png" alt="" style="width:22px;height:22px;object-fit:contain;">
            <span style="font-family:'Plus Jakarta Sans',sans-serif;font-weight:800;font-size:17px;color:#fff;">simplifica</span>
          </div>
          <p style="font-size:13.5px;line-height:1.6;color:#5C6580;margin:0;max-width:320px;">Sala do Agendamento é um programa da Simplifica Aceleradora de Negócios.</p>
        </div>
        <div>
          <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:14px;">Contato</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <a href="https://www.instagram.com/othiagosilvavende/" style="font-size:13.5px;color:#8A94AD;">Instagram</a>
            <a href="https://chat.whatsapp.com/Er4iAiorx9TA5Q6tma3BdR?s=cl&p=i&ilr=0&amv=0" style="font-size:13.5px;color:#8A94AD;">WhatsApp</a>
          </div>
        </div>
        <div>
          <div style="font-size:13px;font-weight:700;color:#fff;margin-bottom:14px;">Políticas</div>
          <div style="display:flex;flex-direction:column;gap:8px;">
            <a href="#" style="font-size:13.5px;color:#8A94AD;">Política de Privacidade</a>
            <a href="#" style="font-size:13.5px;color:#8A94AD;">Termos de Uso</a>
          </div>
        </div>
      </div>
      <div style="border-top:1px solid rgba(255,255,255,0.08);padding-top:24px;">
        <p style="font-size:12.5px;color:#4B5568;margin:0;">Simplifica Aceleradora de Negócios — Todos os direitos reservados.</p>
      </div>
    </div>
  </div>

</div>

`;

export default function SalaAgendamentoLP() {
  // Do <script> original sobrou só o ajuste das citações (o letreiro já vem
  // montado no HTML). Ele roda de novo depois de um instante e quando as
  // fontes carregam, porque a largura do texto muda com a fonte final.
  useEffect(() => {
    const fitQuote = (box: Element) => {
      const el = box as HTMLElement;
      const text = el.querySelector(".quote-text") as HTMLElement | null;
      if (!text) return;
      const base = parseFloat(el.dataset.baseSize ?? "16");
      text.style.fontSize = base + "px";
      const boxWidth = el.clientWidth - 24;
      const textWidth = text.scrollWidth;
      const scale = textWidth > boxWidth ? boxWidth / textWidth : 1;
      text.style.fontSize = Math.max(8, base * scale * 0.94) + "px";
    };
    const fitAll = () => document.querySelectorAll(".quote-box").forEach(fitQuote);

    fitAll();
    const t = setTimeout(fitAll, 400);
    window.addEventListener("resize", fitAll);
    if (document.fonts?.ready) document.fonts.ready.then(fitAll);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", fitAll);
    };
  }, []);

  return (
    <>
      {/* Fontes da landing — de propósito só aqui, e não no layout: o app usa
          Sora/Manrope, e carregar as fontes da LP em todas as telas seria peso
          à toa. O aviso do lint pressupõe fonte global; esta é de uma página. */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div dangerouslySetInnerHTML={{ __html: HTML }} />
    </>
  );
}
