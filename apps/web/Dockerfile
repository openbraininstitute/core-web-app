# Build from the repository root: docker build -f apps/web/Dockerfile .
# Stages follow Turborepo's prune pattern: the install layer depends only on the package.json
# files and the pruned lockfile, so a source-only change reuses the installed node_modules.

FROM node:24-alpine AS base
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
# to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app


# Keep only @obi/web and the workspace packages it depends on
FROM base AS prune
# turbo version comes from the root package.json, so the image and the repo never drift;
# copied alone first so this layer survives source changes
COPY package.json ./
RUN npm install -g "turbo@$(node -p "require('./package.json').devDependencies.turbo")"
COPY . .
RUN turbo prune @obi/web --docker


# Install dependencies only when needed
FROM base AS deps
# corepack picks the exact pnpm from the root package.json "packageManager" field
RUN corepack enable
COPY --from=prune /app/out/json/ .
# no git in the image: skip installing git hooks
ENV LEFTHOOK=0
RUN pnpm install --frozen-lockfile


# Rebuild the source code only when needed
FROM deps AS builder
COPY --from=prune /app/out/full/ .
# the install above is --frozen-lockfile; pnpm's mtime-based re-check would fail whenever a cached
# install layer meets package.json files with newer timestamps but identical content
ENV pnpm_config_verify_deps_before_run=false
ARG APP_VERSION
ENV APP_VERSION=${APP_VERSION}
# per-app cache id: a cache written by another app or the old single-app layout must not be reused;
# local:r = read-only turbo cache: writing a copy of .next into a throwaway layer only costs time
RUN --mount=type=cache,id=next-web,target=/app/apps/web/.next/cache \
  pnpm turbo run build --filter=@obi/web --cache=local:r


# production image, copy all the files and run next
FROM node:24-alpine AS runner

ARG APP_VERSION
ENV APP_VERSION=${APP_VERSION}

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
WORKDIR /app

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
# In a monorepo the standalone tree mirrors the repo: node_modules at its root, the app under apps/web
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# The standalone output has no .next/cache, and Next writes its caches there as nextjs
RUN mkdir -p apps/web/.next/cache && chown nextjs:nodejs apps/web/.next/cache

USER nextjs

EXPOSE 8000

ENV PORT=8000

CMD ["node", "apps/web/server.js"]
