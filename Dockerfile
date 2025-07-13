# ================================================================
# Stage 1: Dependencies & Build
# ================================================================
FROM node:18-bullseye AS builder

# Set working directory
WORKDIR /app

# Accept the Git commit hash as a build argument
ARG GIT_COMMIT_HASH
# Expose it as an environment variable for the `next build` command to use
ENV GIT_COMMIT_HASH=$GIT_COMMIT_HASH

# 1. Install dependencies
COPY package*.json ./
RUN npm ci

# 2. Copy the rest of the application source code
COPY . .

# 3. Generate Prisma Client
RUN npx prisma generate

# 4. Build the Next.js application for production
RUN npm run build


# ================================================================
# Stage 2: Production Image
# ================================================================
FROM node:18-bullseye-slim AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Install openssl for Prisma
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# 1. Copy over the standalone application output
COPY --from=builder /app/.next/standalone ./

# 2. Copy over the public assets (images, fonts, etc.)
COPY --from=builder /app/public ./public

# 3. Copy over the compiled static assets (.js, .css chunks)
COPY --from=builder /app/.next/static ./.next/static

# 4. Copy Prisma schema and client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# 5. Copy the production environment file
COPY --from=builder /app/.env.production ./.env.production

# Expose the port the app will run on
EXPOSE 3000

# Start the Node.js server
CMD ["node", "server.js"]
