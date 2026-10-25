# Digital Twin Airport web (Next.js standalone server)
#
#   docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api/v1 -t digital-twin-airport-web .
#   docker run -p 3000:3000 digital-twin-airport-web
#
# NEXT_PUBLIC_API_URL is compiled into the client bundle, so it is a build arg (one image per
# API endpoint). The socket connects to the same host without the /api/v1 suffix.

ARG NODE_VERSION=24

# --- Dependencies (husky / prepare scripts skipped) ---
FROM node:${NODE_VERSION}-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --no-audit --no-fund --ignore-scripts

# --- Build ---
FROM node:${NODE_VERSION}-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ARG NEXT_PUBLIC_API_URL
RUN test -n "$NEXT_PUBLIC_API_URL" \
  || (echo "ERROR: build arg NEXT_PUBLIC_API_URL is required, e.g. https://api.example.com/api/v1" && exit 1)
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
  NEXT_STANDALONE=1 \
  NEXT_TELEMETRY_DISABLED=1 \
  NODE_ENV=production \
  NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

# --- Runtime: standalone server + static assets (incl. BIM models in public/models) ---
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
  NEXT_TELEMETRY_DISABLED=1 \
  PORT=3000 \
  HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/').then((r) => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"
CMD ["node", "server.js"]
