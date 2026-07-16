# Simplifica Sales Academy

Plataforma de treinamento comercial de 30 dias: vendedores enviam áudios/vídeos de atendimentos reais e recebem análise automática por IA — nota por critério, pontos fortes, pontos fracos e uma missão prática para o próximo atendimento. Gestores acompanham a evolução da equipe em um painel administrativo.

> 📄 Escopo completo do produto em [docs/ESCOPO.md](docs/ESCOPO.md).

## Stack

- **Front-end:** Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Autenticação:** Firebase Authentication (Google + e-mail/senha)
- **Banco:** Cloud Firestore
- **Backend/IA:** Route Handler do Next.js (`/api/analyze`) · OpenAI (Whisper + GPT-4o) · ffmpeg
- **Arquivos:** Firebase Storage (upload direto do cliente; o backend baixa para processar)

## Status de implementação

| Fase | Escopo | Status |
|---|---|---|
| 0 | Fundação — setup, estrutura, Firebase | ✅ |
| 1 | Autenticação + cadastro de perfil | ✅ |
| 2 | Dashboard do vendedor | ✅ |
| 3 | Upload + pipeline de IA (transcrição + análise) | ✅ |
| 4 | Progressão + jornada de 30 dias + histórico | ✅ |
| 5 | Painel do gestor (admin) | ✅ |
| 6 | Deploy | ⏳ |

Fora do MVP: redesign completo de UI/UX, landing page como home, ranking, certificados, gamificação, análise visual de vídeo, integração com CRM.

## Configuração

### 1. Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha:

- **`NEXT_PUBLIC_FIREBASE_*`** — Console do Firebase → Configurações do projeto → Seus apps → App da Web.
- **`OPENAI_API_KEY`** — https://platform.openai.com/api-keys (a conta precisa ter **créditos**, senão a API retorna `insufficient_quota`).
- **`AI_MOCK`** — `true` faz o pipeline devolver uma análise de exemplo **sem chamar a OpenAI** (útil para desenvolver e demonstrar sem custo). Use `false` em produção.

### 2. Credencial do backend (Firebase Admin)

Console do Firebase → ⚙️ Configurações do projeto → **Contas de serviço** → **Gerar nova chave privada**. Salve o arquivo como **`service-account.json`** na raiz deste diretório. Ele é secreto e já está no `.gitignore`.

Em produção, prefira as variáveis `FIREBASE_ADMIN_*` (ver `.env.example`).

### 3. Regras de segurança

Publique as regras versionadas no Console do Firebase:

- [`firestore.rules`](firestore.rules) → Firestore → Regras
- [`storage.rules`](storage.rules) → Storage → Regras *(quando o Storage for ativado)*

Elas garantem que cada vendedor só acessa os próprios dados, que ninguém se autopromove a admin, e que **notas, análises e progresso só podem ser gravados pelo backend** (anti-fraude).

> ⚠️ **Atenção:** o banco Firestore deste projeto foi criado com o nome **`default`** (e não o padrão `(default)`). O código já aponta para ele — se um dia for recriado com o nome padrão, ajuste `src/lib/firebase.ts` e `src/lib/server/firebaseAdmin.ts`.

## Rodando localmente

```bash
npm install
npm run dev       # http://localhost:3000
```

## Scripts utilitários

```bash
# Cria (ou promove) uma conta de gestor/admin
node scripts/make-admin.mjs gestor@empresa.com SenhaForte123

# Testa o pipeline /api/analyze de ponta a ponta
node scripts/test-pipeline.mjs

# Valida as regras: admin lê a equipe; vendedor recebe permission-denied
node scripts/test-admin.mjs
```

## Como funciona o pipeline de análise

1. O vendedor escolhe o arquivo em `/upload`; o navegador envia **direto para o Firebase Storage** em `uploads/{uid}/…` (com barra de progresso). O arquivo não passa pelo servidor do app — por isso não há limite de tamanho de requisição.
2. `POST /api/analyze` recebe apenas o **caminho** do arquivo, verifica o token do Firebase e **rejeita caminho fora da pasta do próprio vendedor**.
3. O backend baixa o arquivo do Storage. **ffmpeg** extrai a faixa de áudio (no caso de vídeo), comprime para mp3 mono 16 kHz e, se necessário, divide em blocos abaixo do limite de 25 MB do Whisper.
4. **Whisper** transcreve; **GPT-4o** analisa com saída estruturada (JSON Schema), recebendo o perfil do vendedor, a fase da semana e a **base de conhecimento** (coleção `knowledge`, editável em `/admin/conhecimento`) como contexto.
5. A **nota geral é recalculada no backend** pela média ponderada dos 8 critérios — o número que a IA escreve não é usado.
6. Análise, upload e progresso são gravados no Firestore; o dashboard atualiza em tempo real.

## Painel do gestor (admin)

- `/admin` — acompanhamento da equipe
- `/admin/usuarios` — promover/rebaixar gestor e criar contas
- `/admin/conhecimento` — abastecer a IA (sem mexer em código)
- `/admin/testar-ia` — analisar uma transcrição sem salvar nada

## Produção — o que ainda precisa ser decidido

- **Hospedagem:** o pipeline roda em um Route Handler Node.js com ffmpeg e pode levar minutos. **Vercel (plano gratuito) não é adequado** pelo limite de duração da função. Recomendado: Cloud Run, Railway, Render ou um servidor Node próprio. (O limite de *tamanho de upload* deixou de ser problema: o arquivo vai direto para o Storage.)
- **Retenção de gravações:** os áudios/vídeos ficam no Storage indefinidamente e consomem armazenamento cobrado (plano Blaze). Vale definir uma política de expiração (ex.: apagar com mais de 90 dias) — a transcrição e a análise permanecem no Firestore.
- **Custo:** ~US$ 0,10 por atendimento de 10 min (transcrição + análise), mais armazenamento/banda do Storage. Configure alertas de orçamento na OpenAI e no Google Cloud.
- **LGPD:** as gravações contêm conversas com terceiros. Definir consentimento no upload e política de retenção.
