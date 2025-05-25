# ────────────────────────────────────────────────────────────────
# Stage 1: Install & Build
# ────────────────────────────────────────────────────────────────
FROM node:18-alpine AS builder
WORKDIR /app

# 1. Install all project dependencies (dev + prod)
# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./
# Install dependencies based on the lock file
RUN npm ci

# 2. Copy the rest of the application source code
# This includes your prisma/schema.prisma file, next.config.ts, etc.
COPY . .

# 3. Generate Prisma Client
# This MUST happen after dependencies are installed ('@prisma/client' and 'prisma' CLI)
# and after schema.prisma is copied.
RUN npx prisma generate

# 4. Build your Next.js app in standalone mode
# Now, when 'next build' runs, the Prisma Client will be available
RUN npm run build


# ────────────────────────────────────────────────────────────────
# Stage 2: Production Image
# ────────────────────────────────────────────────────────────────
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
# Set a default port, can be overridden by environment variable at runtime
ENV PORT=3000

# Copy the Next.js standalone output
COPY --from=builder /app/.next/standalone ./

# Copy static assets (if any) from the public folder and .next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

# --- Prisma Client Runtime Files ---
# Copy the generated Prisma Client (including query engine binaries)
# This is crucial for the standalone build to find the Prisma engine at runtime.
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client

# Copy the schema.prisma file. While the client is generated, having the schema
# can be important for Prisma Client at runtime, especially with env vars in datasource.
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma


# Expose the port the app runs on
EXPOSE ${PORT}

# Start the Next.js application
# The standalone output creates a server.js file.
CMD ["node", "server.js"]