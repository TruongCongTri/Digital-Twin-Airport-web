# ==========================================
# Phase 1: Dependencies
# ==========================================
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Copy package files and install (bypassing Husky and audits)
COPY package.json package-lock.json* ./
RUN npm ci --no-audit --no-fund --ignore-scripts

# ==========================================
# Phase 2: Builder
# ==========================================
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Set environment variables for the build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Force 4GB of RAM allocation for the build
ENV NODE_OPTIONS="--max-old-space-size=4096"

# Run the build
RUN npm run build

# ==========================================
# Phase 3: Production Runner
# ==========================================
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Create a secure, non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy the public folder
COPY --from=builder /app/public ./public

# Set permissions for the prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Automatically leverage the standalone output traces
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to the secure user
USER nextjs

EXPOSE 3000

# Start the server using the standalone bundle
CMD ["node", "server.js"]