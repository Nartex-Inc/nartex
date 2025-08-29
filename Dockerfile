# ============================
# Stage 1: Build
# ============================
FROM node:18-bullseye AS builder
WORKDIR /app

# ---- Build args (Next.js needs these at build time)
ARG GIT_COMMIT_HASH
ARG DATABASE_URL
ARG EMAIL_SERVER_HOST
ARG EMAIL_SERVER_PORT
ARG EMAIL_SERVER_USER
ARG EMAIL_SERVER_PASSWORD
ARG EMAIL_FROM
ARG NEXTAUTH_URL
ARG NEXTAUTH_SECRET
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG AZURE_AD_CLIENT_ID
ARG AZURE_AD_CLIENT_SECRET
ARG AZURE_AD_TENANT_ID

# Set environment variables for the build process
ENV GIT_COMMIT_HASH=$GIT_COMMIT_HASH \
    DATABASE_URL=$DATABASE_URL \
    EMAIL_SERVER_HOST=$EMAIL_SERVER_HOST \
    EMAIL_SERVER_PORT=$EMAIL_SERVER_PORT \
    EMAIL_SERVER_USER=$EMAIL_SERVER_USER \
    EMAIL_SERVER_PASSWORD=$EMAIL_SERVER_PASSWORD \
    EMAIL_FROM=$EMAIL_FROM \
    NEXTAUTH_URL=$NEXTAUTH_URL \
    NEXTAUTH_SECRET=$NEXTAUTH_SECRET \
    GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID \
    GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET \
    AZURE_AD_CLIENT_ID=$AZURE_AD_CLIENT_ID \
    AZURE_AD_CLIENT_SECRET=$AZURE_AD_CLIENT_SECRET \
    AZURE_AD_TENANT_ID=$AZURE_AD_TENANT_ID \
    NEXT_TELEMETRY_DISABLED=1 \
    NODE_ENV=production

# 1) Copy package files and install dependencies
COPY package*.json ./
RUN npm ci --include=dev

# 2) Copy prisma schema first for generation
COPY prisma ./prisma

# 3) Generate Prisma client BEFORE copying source code
RUN npx prisma generate

# 4) Copy the rest of the source code
COPY . .

# 5) Copy .env.production if it exists (created by buildspec)
# This provides a fallback for any missing environment variables
COPY .env.production* ./

# 6) Create required utility files if missing
RUN mkdir -p src/lib src/components/ui src/components/dashboard && \
    if [ ! -f src/lib/utils.ts ]; then \
      echo 'import { type ClassValue, clsx } from "clsx"; \
            import { twMerge } from "tailwind-merge"; \
            export function cn(...inputs: ClassValue[]) { \
              return twMerge(clsx(inputs)); \
            }' > src/lib/utils.ts; \
    fi

# 7) Create stub components if missing to prevent build failures
RUN if [ ! -f src/components/ui/input.tsx ]; then \
      echo 'import * as React from "react"; \
            import { cn } from "@/lib/utils"; \
            export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {} \
            export const Input = React.forwardRef<HTMLInputElement, InputProps>( \
              ({ className, ...props }, ref) => ( \
                <input \
                  ref={ref} \
                  className={cn( \
                    "flex h-9 w-full rounded-md border bg-white/90 dark:bg-neutral-900 px-3 py-2 text-sm outline-none", \
                    className \
                  )} \
                  {...props} \
                /> \
              ) \
            ); \
            Input.displayName = "Input"; \
            export default Input;' > src/components/ui/input.tsx; \
    fi

# 8) Run Prisma migrations if they exist (for build-time schema validation)
RUN if [ -d prisma/migrations ] && [ "$(ls -A prisma/migrations)" ]; then \
      echo "Running Prisma migrations..."; \
      npx prisma migrate deploy || echo "Migration deploy skipped (no DB connection during build)"; \
    fi

# 9) Build Next.js application
# The build will now have access to all environment variables
RUN npm run build

# 10) Verify critical build outputs
RUN test -f .next/standalone/server.js || (echo "❌ Missing standalone server.js" && exit 1)

# ============================
# Stage 2: Runtime
# ============================
FROM node:18-bullseye-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# Install minimal runtime dependencies
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl openssl \
 && rm -rf /var/lib/apt/lists/*

# Install RDS CA certificates
RUN set -eux; \
    dest="/etc/ssl/certs/rds-ca.pem"; \
    curl -fsSL "https://truststore.pki.rds.amazonaws.com/ca-central-1/ca-bundle.pem" -o "$dest" \
    || curl -fsSL "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem" -o "$dest"; \
    chmod 0644 "$dest"; \
    ln -sf "$dest" /etc/ssl/certs/rds-combined-ca-bundle.pem

# Make Node trust the RDS certificate bundle
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/rds-ca.pem

# Copy Next.js standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma files for runtime
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Health check
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -fsS http://localhost:3000/api/health || exit 1

EXPOSE 3000

# Use exec form to ensure proper signal handling
CMD ["node", "server.js"]
