# Install dependencies only when needed
FROM node:23-alpine AS deps
# Check https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
# to understand why libc6-compat might be needed.
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

# Install dependencies based on the preferred package manager
COPY pnpm-lock.yaml package.json ./
COPY tarball ./tarball
RUN pnpm install --frozen-lockfile
RUN pnpm add sharp


# Rebuild the source code only when needed
FROM node:23-alpine AS builder

ARG DEPLOYMENT_ENV
ARG CORE_WEB_APP_VERSION

ENV NODE_OPTIONS="--max_old_space_size=7168"
ENV CORE_WEB_APP_VERSION=${CORE_WEB_APP_VERSION}
ENV NEXT_PUBLIC_CORE_WEB_APP_VERSION=${CORE_WEB_APP_VERSION}

# Install pnpm
RUN corepack enable && corepack prepare pnpm@10 --activate

WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Copy correct .env file according to the deployment environment
RUN cp .deployment-envs/.env.$DEPLOYMENT_ENV .env.production

RUN pnpm run build


# production image, copy all the files and run next
FROM node:23-alpine AS runner
WORKDIR /app

ARG CORE_WEB_APP_VERSION
ENV NODE_ENV=production
ENV NEXT_PUBLIC_CORE_WEB_APP_VERSION=${CORE_WEB_APP_VERSION}

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Automatically leverage output traces to reduce image size
# https://nextjs.org/docs/advanced-features/output-file-tracing
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8000

ENV PORT=8000

CMD ["node", "server.js"]