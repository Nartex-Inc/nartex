# ────────────────────────────────────────────────────────────────
# Stage 1 – Install & Build
# ────────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

# 1. Install all project dependencies
COPY package*.json ./
RUN npm ci

# 2. Copy the full application source & env for build-time
COPY . .
# buildspec should already have created .env.production
COPY .env.production .env.production

# 3. Generate Prisma Client
RUN npx prisma generate

# 4. Build Next.js in standalone mode
RUN npm run build


# ────────────────────────────────────────────────────────────────
# Stage 2 – Production Image
# ────────────────────────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# 1️⃣ Bring in your standalone server + node_modules
COPY --from=builder /app/.next/standalone ./

# 2️⃣ Copy the compiled static assets (JS chunks + media)
COPY --from=builder /app/.next/static ./.next/static

# 3️⃣ Copy any “public/” folder files
COPY --from=builder /app/public ./public

# 4️⃣ Prisma runtime files (if you use Prisma at runtime)
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma

# 5️⃣ (Optional) Copy env into the container for runtime vars
COPY --from=builder /app/.env.production ./.env.production

EXPOSE ${PORT}

# Launch the standalone server
CMD ["node", "server.js"]
