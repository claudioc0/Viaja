FROM node:20-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && apk add --no-cache openssl

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/package.json
COPY backend/api/package.json ./backend/api/package.json
RUN pnpm install --frozen-lockfile --filter @viaja/api...

FROM deps AS build
WORKDIR /app
COPY packages/shared ./packages/shared
COPY backend/api ./backend/api
RUN pnpm --filter @viaja/api run db:generate && \
    pnpm --filter @viaja/shared run typecheck && \
    pnpm --filter @viaja/api run typecheck

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3333

COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/package.json ./package.json
COPY --from=build --chown=node:node /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=build --chown=node:node /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=build --chown=node:node /app/packages/shared ./packages/shared
COPY --from=build --chown=node:node /app/backend/api ./backend/api

USER node
WORKDIR /app/backend/api
EXPOSE 3333

HEALTHCHECK --interval=15s --timeout=5s --start-period=15s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3333/api/health || exit 1

CMD ["sh", "-c", "pnpm run db:migrate:deploy && pnpm run start"]
