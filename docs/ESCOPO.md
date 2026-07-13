# Documento de Escopo — Plataforma de Treinamento Comercial com IA

> **Nome de trabalho sugerido:** Simplifica Sales Academy
> **Versão do documento:** 1.0
> **Data:** 13/07/2026
> **Autor do escopo:** com base no briefing da Simplifica
> **Objetivo deste documento:** servir de guia único para o desenvolvimento do MVP e das fases seguintes. Cobre produto, telas, regras de negócio, especificação da IA, pipeline de mídia, modelo de dados, arquitetura, segurança, custos e fases de entrega.

---

## 1. Visão geral do produto

Plataforma web de **treinamento comercial de 30 dias**. Cada vendedor entra diariamente, envia um **áudio ou vídeo (reunião/ligação) de um atendimento real** e recebe uma **análise automática gerada por IA** sobre sua performance comercial: resumo, pontos fortes, pontos fracos, nota por critério e uma missão prática para o próximo atendimento.

A barra de progresso evolui com base em **consistência** (enviou o atendimento do dia) e **qualidade** (melhorou a nota ao longo do tempo), até o vendedor atingir o nível de **"atendimento ideal"** (nota consistente acima de 85/100).

Um **painel administrativo** transforma o site em ferramenta de gestão comercial: o gestor acompanha quem enviou, evolução individual, notas médias e principais dificuldades da equipe.

### Fluxo macro
```
Login → Cadastro de perfil → Dashboard → Upload diário (áudio/vídeo)
     → Transcrição → Análise da IA → Nota + Plano de melhoria
     → Evolução na barra de progresso
```

---

## 2. Objetivos

- Criar **rotina diária** de envio e evolução ao longo de 30 dias.
- Entregar **análise personalizada** (com base no perfil do vendedor), não genérica.
- Padronizar a avaliação com **critérios fixos e pesos definidos**.
- Dar ao gestor **visibilidade da equipe** em um painel único.
- Ser **enxuto no MVP** e expansível (cursos, gamificação, CRM) no futuro.

---

## 3. Papéis de usuário

| Papel | Descrição | Acesso |
|---|---|---|
| **Vendedor** (`seller`) | Faz login, cadastra perfil, envia atendimentos, acompanha a própria evolução. | Seus próprios dados apenas. |
| **Admin / Gestor** (`admin`) | Responsável pelo treinamento. Acompanha toda a equipe. | Dados de todos os vendedores (leitura) + gestão. |

O papel é gravado no documento do usuário (`role`) e controla tanto a navegação no front quanto as regras de segurança no banco.

---

## 4. Requisitos funcionais por módulo

### 4.1 Autenticação
- Login com **Google** (provedor federado do Firebase Auth).
- Login com **e-mail e senha**.
- Recuperação de senha por e-mail.
- Proteção de rotas: usuário não autenticado é redirecionado ao login.
- Redirecionamento por papel: `seller` → Dashboard do vendedor; `admin` → Painel admin.

### 4.2 Cadastro de perfil (primeiro acesso)
Após o primeiro login, o vendedor preenche:
- Nome
- Empresa
- Cargo / função
- Tempo de experiência em vendas
- Tipo de atendimento: ligação, WhatsApp, presencial, reunião, SDR, closer (multiescolha)
- Principal dificuldade comercial
- Objetivo no treinamento

Esses dados são **injetados no prompt da IA** para personalizar a análise. O cadastro define `trainingStartDate` e inicia o treinamento no Dia 1.

### 4.3 Upload do atendimento
- Upload de **áudio** (mp3, m4a, wav, ogg) **ou vídeo** (mp4, mov, webm).
- Campo "tipo de atendimento" (ligação, reunião, WhatsApp áudio etc.).
- Campo opcional de observação (ex.: "lead pediu desconto no final").
- Botão "Enviar para análise".
- Feedback de status: enviando → processando → concluído / erro.
- Regra: **1 envio conta como o atendimento do dia** para fins de consistência (envios extras são permitidos e analisados, mas não contam progresso duplo no mesmo dia).

### 4.4 Análise da IA
Gera saída **estruturada** (ver seção 8) com:
- Resumo geral
- O que fez bem
- O que fez errado / deixou passar
- Onde pode melhorar
- Nota por critério (9 critérios com pesos)
- Nota geral (0–100)
- Próxima missão (tarefa objetiva)

### 4.5 Progressão
- Barra de progresso baseada em **consistência + qualidade** (ver seção 6).
- Níveis 1 a 5 (ver seção 7).
- Cálculo de "atendimento ideal atingido".

### 4.6 Histórico
- Lista de todos os envios do vendedor: data, tipo de arquivo, nota, status, link "ver análise".

### 4.7 Área "Cursos Simplifica — em breve"
- Seção bloqueada com mensagem: *"Em breve, você terá acesso aos treinamentos comerciais da Simplifica para acelerar ainda mais sua evolução."*

### 4.8 Painel admin
- Lista de vendedores.
- Quem enviou / não enviou o atendimento do dia.
- Evolução de cada vendedor (nota ao longo do tempo).
- Notas médias por vendedor e da equipe.
- Principais dificuldades por vendedor.
- Status geral da equipe.
- Histórico completo das análises (somente leitura).

---

## 5. Telas principais

| # | Tela | Elementos-chave |
|---|---|---|
| 1 | **Login** | Entrar com Google; entrar com e-mail/senha; recuperar senha. |
| 2 | **Cadastro de perfil** | Nome, empresa, função, tipo de venda, dificuldade, objetivo. |
| 3 | **Dashboard do vendedor** | "Olá, [Nome]", barra de progresso, dia atual do treinamento, botão "Enviar atendimento de hoje", última análise, nota atual, próxima missão, histórico resumido. |
| 4 | **Upload** | Upload áudio/vídeo, tipo de atendimento, observação opcional, botão enviar. |
| 5 | **Análise** | Nota geral, pontos positivos, pontos de melhoria, erros, notas por critério, checklist, próxima missão. |
| 6 | **Histórico** | Lista: data, tipo, nota, status, ver análise. |
| 7 | **Cursos Simplifica — em breve** | Seção bloqueada / call-to-action. |
| 8 | **Painel admin** | Lista de vendedores, status do dia, evolução, médias, dificuldades. |

Todas as telas **responsivas** (mobile-first — vendedor provavelmente usa celular para enviar o atendimento).

---

## 6. Regras da barra de progressão

A barra **não avança só por fazer upload**. Combina consistência e qualidade.

**Regras (configuráveis):**
- Upload feito no dia → **+1 ponto de consistência**.
- Nota > 70 → progresso moderado.
- Nota > 80 → bom progresso.
- Nota > 85 por **3 dias seguidos** → vendedor "próximo do atendimento ideal".
- Sem upload no dia → **não avança**.
- Nota muito baixa → **mantém** progresso, mas dispara recomendação de reforço.

**Cálculo do percentual (proposta):**
```
progressoConsistencia = diasComEnvio / 30           (peso 50%)
progressoQualidade    = mediaMovel(notas) / 100      (peso 50%)
progressPercent       = round( (0.5*consistencia + 0.5*qualidade) * 100 )
```
Isso impede o vendedor de "encher barra" subindo áudio qualquer.

---

## 7. Critério de atendimento ideal e níveis

### 7.1 Pesos por critério (total 100)
| Critério | Peso |
|---|---|
| Abertura e postura inicial | 10 |
| Clareza na comunicação | 10 |
| Diagnóstico do cenário | 20 |
| Identificação da dor/problema | 15 |
| Geração de valor | 15 |
| Tratamento de objeções | 10 |
| Condução do próximo passo | 10 |
| Fechamento / CTA | 10 |

> Observação: o briefing lista 9 critérios visuais na tela de análise (inclui "Investigação/diagnóstico" e "Postura comercial geral"). Consolidamos em **8 critérios com peso** para o cálculo da nota, e exibimos os textos qualitativos dos demais como comentários. A IA retorna nota 0–100 por critério; a **nota geral é a média ponderada pelos pesos**.

### 7.2 "Atendimento ideal"
Atingido quando o vendedor **mantém** nota geral **> 85** de forma consistente (ex.: 3+ dias) — não por acerto isolado.

### 7.3 Níveis (visual de evolução)
| Nível | Nome | Descrição |
|---|---|---|
| 1 | Iniciante | Enviou primeiros atendimentos, recebeu diagnóstico. |
| 2 | Em desenvolvimento | Começou a melhorar abordagem e clareza. |
| 3 | Consultivo | Faz boas perguntas, entende melhor a dor. |
| 4 | Estratégico | Conduz objeções e próximo passo com segurança. |
| 5 | Atendimento ideal | Mantém nota alta e atendimento consistente. |

---

## 8. Especificação da IA (o coração do produto)

### 8.1 Estratégia
- Modelo de análise: **GPT-4o** (ou equivalente vigente) com **saída estruturada em JSON** (JSON mode / structured outputs) para garantir formato fixo.
- Transcrição: **Whisper API** (`whisper-1` / modelo de transcrição vigente).
- Idioma: **português (pt-BR)**.
- A chave da OpenAI fica **exclusivamente no backend** (Cloud Function), nunca no front-end.

### 8.2 Contexto injetado no prompt
- Perfil do vendedor (nome, empresa, cargo, experiência, tipo de venda, dificuldade principal, objetivo).
- Dia atual do treinamento e fase da semana (1 a 4).
- Observação do atendimento (se houver).
- Transcrição do atendimento.

### 8.3 Rubrica (system prompt, resumida)
> "Você é um avaliador comercial sênior. Avalie o atendimento transcrito segundo os 8 critérios e pesos definidos. Seja específico e cite trechos. Fale com o vendedor pelo nome, considerando seu perfil e dificuldade. Retorne **apenas** JSON válido no schema fornecido. Notas de 0 a 100 por critério."

### 8.4 Schema de saída (JSON)
```json
{
  "summary": "string",
  "strengths": ["string"],
  "mistakes": ["string"],
  "improvements": ["string"],
  "criteriaScores": {
    "abertura": 0,
    "clareza": 0,
    "diagnostico": 0,
    "dor": 0,
    "valor": 0,
    "objecoes": 0,
    "proximoPasso": 0,
    "fechamento": 0
  },
  "generalScore": 0,
  "nextMission": "string"
}
```
`generalScore` é recalculado no backend pela média ponderada (não confia-se cegamente no número que a IA escreve), garantindo consistência com os pesos.

### 8.5 Consistência da nota
- Temperatura baixa + rubrica fixa + pesos aplicados no backend.
- Nota nunca será 100% determinística (limitação inerente de LLM), mas fica estável e auditável.

---

## 9. Pipeline de mídia (áudio + vídeo/reuniões)

Como você confirmou **áudio e vídeo (reuniões)**, o backend precisa tratar arquivos grandes. A transcrição da OpenAI aceita **no máximo 25 MB por arquivo**, o que vídeos facilmente ultrapassam.

### Fluxo completo
```
1. Vendedor sobe áudio ou vídeo (Storage: uploads/{userId}/{data}/arquivo.ext)
2. Upload dispara a Cloud Function (gatilho de Storage ou chamada HTTPS)
3. Function baixa o arquivo temporariamente
4. Se for VÍDEO → extrai a faixa de áudio com ffmpeg (converte para mp3/opus)
5. Se o áudio for > ~24 MB / muito longo → divide em blocos (chunking) por tempo
6. Cada bloco vai para a Whisper API → transcrições concatenadas em ordem
7. Transcrição completa + perfil + observação → GPT-4o (JSON mode)
8. Backend valida o JSON, recalcula generalScore pelos pesos
9. Salva em `analyses`, atualiza `uploads.status = done`
10. Atualiza `progress` e `users.progressPercent / averageScore`
11. Front exibe a devolutiva (atualização em tempo real via listener do Firestore)
```

### Observações técnicas
- **ffmpeg** roda dentro da Cloud Function (binário disponível no runtime de Functions/Cloud Run).
- **Chunking**: dividir por tempo (ex.: blocos de ~10 min) evita estourar o limite e o timeout.
- Para arquivos muito grandes/longos, considerar **Cloud Run** (timeouts maiores) em vez de Cloud Functions puras — decisão da Fase 3.
- Processamento é **assíncrono**: o vendedor vê "processando" e a tela atualiza sozinha quando conclui.

---

## 10. Modelo de dados (Firestore)

```
users/{userId}
  name: string
  email: string
  role: "seller" | "admin"
  company: string
  salesRole: string
  experience: string
  attendanceTypes: string[]
  mainDifficulty: string
  goal: string
  trainingStartDate: timestamp
  currentDay: number
  progressPercent: number
  averageScore: number
  currentLevel: number (1-5)
  createdAt: timestamp

uploads/{uploadId}
  userId: string
  fileUrl: string
  fileType: "audio" | "video"
  mimeType: string
  status: "pending" | "processing" | "done" | "error"
  trainingDay: number
  observation: string
  createdAt: timestamp

analyses/{analysisId}
  userId: string
  uploadId: string
  transcript: string
  summary: string
  strengths: string[]
  mistakes: string[]
  improvements: string[]
  criteriaScores: map<string, number>
  generalScore: number
  nextMission: string
  createdAt: timestamp

progress/{userId}
  totalUploads: number
  completedDays: number
  currentLevel: number
  bestScore: number
  averageScore: number
  idealAttendanceReached: boolean
  highScoreStreak: number        // dias seguidos com nota > 85
  lastAnalysisDate: timestamp
```

> Alternativa de modelagem: `uploads` e `analyses` podem virar subcoleções de `users/{userId}` para simplificar as regras de segurança. Decisão fechada na Fase 0.

---

## 11. Arquitetura técnica

| Camada | Tecnologia |
|---|---|
| Front-end | **Next.js** (React), responsivo, mobile-first |
| Autenticação | **Firebase Authentication** (Google + e-mail/senha) |
| Banco de dados | **Cloud Firestore** |
| Arquivos | **Firebase Storage** (`uploads/{userId}/{data}/arquivo.ext`) |
| Backend/IA | **Firebase Cloud Functions** (e/ou **Cloud Run** para mídia pesada) |
| IA | **OpenAI**: Whisper (transcrição) + GPT-4o (análise, JSON mode) |
| Hospedagem front | Firebase Hosting ou Vercel |

**Requisito de conta:** Firebase precisa do plano **Blaze (pay-as-you-go)** para que as Functions façam chamadas externas à OpenAI. (Você confirmou que já tem billing configurado.)

---

## 12. Segurança e regras de acesso

- Chave da OpenAI **somente no backend** (variável de ambiente / secret do Firebase). Nunca no front.
- **Firestore Rules:**
  - `seller` lê/escreve apenas documentos onde `userId == auth.uid`.
  - `admin` tem leitura de todos; escrita restrita à gestão.
  - Escrita em `analyses` e campos de progresso: **apenas via backend** (Function com Admin SDK), nunca direto do cliente — evita fraude de nota.
- **Storage Rules:** vendedor só grava/lê na própria pasta `uploads/{seu_uid}/...`.
- Validação de tipo e tamanho de arquivo no upload.
- LGPD: áudios/vídeos são dados de atendimento — definir política de retenção e consentimento (ver Riscos).

---

## 13. Requisitos não-funcionais

- **Responsividade** total (celular, tablet, desktop).
- **Processamento assíncrono** com feedback de status claro.
- **Tempo de análise** alvo: poucos minutos por atendimento (depende do tamanho do arquivo).
- **Escalabilidade**: Firestore + Functions escalam sob demanda.
- **Observabilidade**: logs das Functions para depurar falhas de transcrição/análise.

---

## 14. Estimativa de custos (ordem de grandeza)

- **Por atendimento (~10 min):** transcrição ~US$ 0,06 + análise ~US$ 0,02–0,05 ≈ **~US$ 0,10**.
- **20 vendedores × 30 dias ≈ 600 análises ≈ US$ 60–90/mês** em OpenAI.
- **Firebase (Blaze):** poucos dólares/mês nesse volume (Firestore, Storage, Functions).
- Custos são **variáveis** e escalam com uso. Vale configurar **alertas de orçamento** na OpenAI e no Google Cloud.

> Valores aproximados para planejamento; os preços vigentes de cada API devem ser confirmados no momento da implementação.

---

## 15. Fases de entrega (roadmap)

| Fase | Escopo | Resultado visível |
|---|---|---|
| **0 — Fundação** | Setup Next.js, Firebase (Auth/Firestore/Storage), estrutura de dados, deploy inicial. | App vazio publicado. |
| **1 — Auth + Perfil** | Login Google + e-mail/senha, cadastro de perfil, papéis, rotas protegidas. | Login e cadastro funcionando. |
| **2 — Dashboard** | Saudação, barra de progresso, dia do treinamento, histórico, próxima missão. | Painel do vendedor navegável. |
| **3 — Upload + Pipeline IA** | Upload áudio/vídeo → Storage → Function → ffmpeg → Whisper → GPT-4o → Firestore → tela de análise. | **Núcleo do produto funcionando.** |
| **4 — Progressão + Jornada 30 dias** | Regras de consistência+qualidade, níveis 1–5, fases por semana, atendimento ideal. | Evolução real do vendedor. |
| **5 — Painel Admin** | Lista, status do dia, evolução, médias, dificuldades da equipe. | Gestor acompanha a equipe. |
| **6 — Acabamento** | Área "Cursos — em breve", responsividade, polimento, teste ponta a ponta. | MVP pronto para uso. |

### Jornada de 30 dias (conteúdo por fase, injetado no contexto da IA)
- **Semana 1 — Diagnóstico e base:** criar hábito de envio; avaliar clareza, abordagem, escuta.
- **Semana 2 — Diagnóstico comercial:** perguntas melhores, entender a dor, não apresentar solução cedo demais.
- **Semana 3 — Objeções e condução:** lidar com "vou pensar", preço, demora; criar próximo passo claro.
- **Semana 4 — Atendimento ideal:** manter nota alta, reduzir erros repetidos, relatório final.

---

## 16. Fora do escopo do MVP (fases futuras)

Ranking · Certificado · Gamificação avançada · Biblioteca completa de cursos · **Análise visual do vídeo** (imagem/linguagem corporal — no MVP usamos só o áudio extraído) · Comparativo entre vendedores · Comentários manuais do gestor · Integração com Kommo/CRM.

---

## 17. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Vídeos grandes estouram limite de transcrição (25 MB) | Extração de áudio (ffmpeg) + chunking; usar Cloud Run se timeouts apertarem. |
| Nota da IA inconsistente | Rubrica fixa, temperatura baixa, JSON mode, nota recalculada pelos pesos no backend. |
| Custo variável crescendo | Alertas de orçamento (OpenAI + GCP); limite de envios/dia se necessário. |
| Vazamento da chave OpenAI | Chave só no backend, em secret; jamais no front. |
| LGPD (áudios de terceiros) | Termo de consentimento no upload; política de retenção/exclusão dos arquivos. |
| Áudio ruim / inaudível | Detectar transcrição vazia/curta e pedir reenvio ao vendedor. |
| Fraude de progresso | Escrita de nota/progresso apenas via backend; cliente não escreve `analyses`. |

---

## 18. Pré-requisitos e dependências

- ✅ Conta **OpenAI** com billing (confirmado).
- ✅ Conta **Firebase** com plano **Blaze** (confirmado).
- Projeto Firebase criado + app web registrado.
- Chave de API OpenAI gerada e guardada como secret.
- Domínio (opcional) para produção.
- Definição da política de privacidade/LGPD para o upload.

---

## 19. Próximos passos

1. **Aprovar este escopo** (ajustes de regras, pesos, textos).
2. Definir nome final do produto (sugestão: **Simplifica Sales Academy**).
3. Iniciar **Fase 0** (setup do projeto e Firebase).
4. Seguir o roadmap fase a fase, validando a cada entrega.

---

*Documento vivo — deve ser atualizado conforme decisões forem tomadas nas fases de implementação.*
