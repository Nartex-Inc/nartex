# ────────────────────────────────────────────────────────────────
# Stage 1 – Install & Build
# ────────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

# 1. Install all project dependencies
COPY package*.json ./
RUN npm ci

# 2. Copy the full application source
COPY . .

# 2 b. Copy the environment file so Next.js can read it at build time
#      (make sure buildspec creates .env.production before docker build)
COPY .env.production .env.production

# 3. Generate Prisma Client
RUN npx prisma generate

# 4. Build the Next.js app in standalone mode
RUN npm run build


# ────────────────────────────────────────────────────────────────
# Stage 2 – Production Image
# ────────────────────────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# Copy the standalone output from Stage 1
COPY --from=builder /app/.next/standalone ./

# Copy static assets
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# Copy Prisma runtime files
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma

# Copy the env file so runtime has the same vars (optional but handy for debugging)
COPY --from=builder /app/.env.production ./.env.production

EXPOSE ${PORT}

CMD ["node", "server.js"]
