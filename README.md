# Simplifica Sales Academy

Plataforma de treinamento comercial de 30 dias: vendedores enviam áudios/vídeos de atendimentos reais e recebem análise automática por IA — nota por critério, pontos fortes, pontos fracos e uma missão prática para o próximo atendimento. Gestores acompanham a evolução da equipe em um painel administrativo.

> 📄 Escopo completo do produto em [docs/ESCOPO.md](docs/ESCOPO.md).

## Stack

- **Front-end:** Next.js (App Router) + TypeScript + Tailwind CSS
- **Autenticação:** Firebase Authentication (Google + e-mail/senha)
- **Banco:** Cloud Firestore
- **Arquivos:** Firebase Storage
- **Backend/IA:** Firebase Cloud Functions · OpenAI (Whisper + GPT-4o)

## Rodando localmente

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie `.env.example` para `.env.local` e preencha com as credenciais do seu projeto Firebase (e, para o pipeline de IA, a chave da OpenAI).

3. Suba o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

4. Acesse [http://localhost:3000](http://localhost:3000).

## Estrutura

```
src/
  app/          Rotas (App Router)
  lib/
    firebase.ts   Inicialização do Firebase (client)
    types.ts      Modelo de dados (users, uploads, analyses, progress)
    constants.ts  Regras de negócio: critérios/pesos, níveis, jornada 30 dias
docs/
  ESCOPO.md     Documento de escopo do produto
```

## Roadmap (fases)

| Fase | Escopo | Status |
|---|---|---|
| 0 | Fundação — setup, estrutura, Firebase | ✅ |
| 1 | Autenticação + cadastro de perfil | ⬜ |
| 2 | Dashboard do vendedor | ⬜ |
| 3 | Upload + pipeline de IA (transcrição + análise) | ⬜ |
| 4 | Progressão + jornada de 30 dias | ⬜ |
| 5 | Painel admin | ⬜ |
| 6 | Acabamento + deploy | ⬜ |

Futuro (fora do MVP): plataforma de cursos da Simplifica, ranking, certificados, gamificação, análise visual de vídeo, integração com CRM.
