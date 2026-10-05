# ---------- Estágio 1: build ----------
# Tem todas as dependências (inclusive as de desenvolvimento) para compilar o TypeScript.
# Também é a imagem usada para aplicar migrations e rodar o seed, pois contém o Prisma CLI.
FROM node:24-alpine AS build
WORKDIR /app

# Os arquivos de dependências são copiados antes do código: enquanto eles não mudarem,
# o Docker reaproveita a camada do `npm ci` e o build seguinte leva segundos.
COPY package.json package-lock.json tsconfig.json ./
# O postinstall executa `prisma generate`, que precisa do schema e da configuração
COPY prisma ./prisma
COPY prisma7.config.ts ./
RUN npm ci

COPY src ./src
RUN npm run build

# ---------- Estágio 2: runtime ----------
# Imagem final: só as dependências de produção e o JavaScript compilado.
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
# --omit=dev deixa de fora as ferramentas de desenvolvimento. O Prisma CLI e o TypeScript também são
# dependências opcionais do @prisma/client, por isso é preciso --omit=optional para removê-los de fato.
# --ignore-scripts: o postinstall chamaria o Prisma CLI, que não existe nesta imagem.
RUN npm ci --omit=dev --omit=optional --ignore-scripts && npm cache clean --force

COPY --from=build /app/dist ./dist

# Roda como usuário sem privilégios, e não como root
USER node

EXPOSE 3000

HEALTHCHECK --interval=10s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/health').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Forma de lista: o Node vira o processo principal do contêiner e recebe o SIGTERM do Docker
CMD ["node", "dist/server.js"]
