# ================================================================
# Stage 1: Dependencies & Build
# ================================================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Accept the Git commit hash as a build argument
ARG GIT_COMMIT_HASH
# Expose it as an environment variable
ENV GIT_COMMIT_HASH=$GIT_COMMIT_HASH

# 1. Install dependencies
COPY package*.json ./
RUN npm ci

# 2. Copy Prisma schema first for better caching
COPY prisma ./prisma/

# 3. Generate Prisma Client
RUN npx prisma generate

# 4. Copy the rest of the application source code
COPY . .

# 5. Build the Next.js application for production
RUN npm run build


# ================================================================
# Stage 2: Production Image
# ================================================================
FROM node:18-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Debian already includes OpenSSL
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client
COPY --from=builder /app/.env.production ./.env.production

EXPOSE 3000
CMD ["node", "server.js"]
