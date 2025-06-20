# ================================================================
# Stage 1: Dependencies & Build
# ================================================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# 1. Install dependencies
# Using `COPY package*.json` ensures this layer is cached unless
# package.json or package-lock.json changes.
COPY package*.json ./
RUN npm ci

# 2. Copy the rest of the application source code
# This includes prisma, src, public, next.config.js, etc.
COPY . .

# 3. Generate Prisma Client
# This must happen after `npm ci` and after `prisma/schema.prisma` is copied.
RUN npx prisma generate

# 4. Build the Next.js application for production
# This creates the optimized build output in the .next folder.
# The .env.production file is NOT needed here. Next.js uses build-time
# environment variables which CodeBuild already provides.
RUN npm run build


# ================================================================
# Stage 2: Production Image
# ================================================================
FROM node:18-alpine AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# 1. Copy over the standalone application output
# This includes the server.js file and a minimal node_modules folder.
COPY --from=builder /app/.next/standalone ./

# 2. Copy over the public assets (images, fonts, etc.)
COPY --from=builder /app/public ./public

# 3. Copy over the compiled static assets (.js, .css chunks)
# This is the crucial step for your frontend assets.
COPY --from=builder /app/.next/static ./.next/static

# 4. Copy over the Prisma schema and generated client for runtime use
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client

# 5. Copy the production environment file created in the buildspec
# This file contains all the secrets and will be read by your app at runtime.
COPY --from=builder /app/.env.production ./.env.production


# Expose the port the app will run on
EXPOSE 3000

# Start the Node.js server
CMD ["node", "server.js"]
