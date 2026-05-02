# Multi-stage Dockerfile for the tide web + worker process.
#
# Final image runs `node server.js` from the Next.js standalone bundle plus
# the worker entrypoint. Same image for both services; the command in
# docker-compose.yml decides which one runs.

# --- builder ----------------------------------------------------------------

FROM node:22-alpine AS builder
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@10.30.3 --activate
RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json tsconfig.base.json biome.json ./
COPY apps/web/package.json apps/web/package.json
COPY packages/sdk/package.json packages/sdk/package.json
COPY packages/extension/package.json packages/extension/package.json

RUN pnpm install --frozen-lockfile

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV TIDE_STANDALONE=1
RUN AUTH_SECRET="build-time-32-bytes-of-padding-xx" \
    DATABASE_DRIVER=sqlite \
    DATABASE_FILE=/tmp/tide-build.sqlite \
    STORAGE_DRIVER=local \
    STORAGE_LOCAL_DIR=/tmp/tide-archive \
    REDIS_URL=redis://localhost:6379 \
    pnpm --filter @tide/web build

# --- runner -----------------------------------------------------------------

FROM node:22-alpine AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache tini curl
RUN addgroup --system --gid 1001 tide && adduser --system --uid 1001 tide

WORKDIR /app

# Standalone server + assets.
COPY --from=builder --chown=tide:tide /app/apps/web/.next/standalone ./
COPY --from=builder --chown=tide:tide /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=tide:tide /app/apps/web/public ./apps/web/public

# Worker code + tsx runtime (so docker-compose can invoke the worker).
COPY --from=builder --chown=tide:tide /app/apps/web/lib ./apps/web/lib
COPY --from=builder --chown=tide:tide /app/apps/web/db ./apps/web/db
COPY --from=builder --chown=tide:tide /app/node_modules ./node_modules

USER tide

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/web/server.js"]
