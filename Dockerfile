# Imagem de produção da Sales Academy.
#
# Usamos Debian slim (não Alpine) de propósito: o binário do ffmpeg-static é
# compilado para glibc e costuma falhar no musl do Alpine — e o ffmpeg é o que
# extrai o áudio dos vídeos de reunião.

# ---------- deps ----------
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# ffmpeg-static baixa o binário no install (precisa de rede aqui).
RUN npm ci

# ---------- builder ----------
FROM node:22-slim AS builder
WORKDIR /app

# As NEXT_PUBLIC_* são embutidas no bundle DURANTE o build, por isso precisam
# chegar como build-arg (o EasyPanel já as envia assim).
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_RETENTION_DAYS=60

ENV NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    NEXT_PUBLIC_RETENTION_DAYS=$NEXT_PUBLIC_RETENTION_DAYS \
    NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------- runner ----------
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# node_modules completo (inclui o binário do ffmpeg-static, que o tracing
# do Next não copia por não ser um módulo JS).
# --chown: o Next escreve em .next/cache ao otimizar imagens em runtime;
# sem isso, rodando como 'node' com arquivos de root, essas escritas falham.
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/.next ./.next
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/next.config.ts ./next.config.ts

# Não roda como root.
USER node

EXPOSE 3000
CMD ["npm", "start"]
