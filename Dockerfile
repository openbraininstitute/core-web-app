# Install dependencies only when needed
FROM node:24-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
# to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@11 --activate

# Install dependencies based on the preferred package manager.
# Vendor tarball must be present: package.json resolves
# @openbraininstitute/morphoviewer via file:vendor/*.tgz (preview + release).
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
COPY vendor ./vendor
RUN pnpm install --frozen-lockfile


# Rebuild the source code only when needed
FROM node:24-alpine AS builder

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

RUN --mount=type=cache,id=next,target=/app/.next/cache \
  npm run build


# production image, copy all the files and run next
FROM node:24-alpine AS runner

ARG APP_VERSION
ENV APP_VERSION=${APP_VERSION}

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
WORKDIR /app

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8000

ENV PORT=8000

CMD ["node", "server.js"]
