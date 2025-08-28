# ============================
# Stage 1: Build
# ============================
FROM node:18-bullseye AS builder
WORKDIR /app

# Cache-busting argument - changes every build
ARG CACHEBUST=1
ENV CACHEBUST=$CACHEBUST

# Build args (Next may read some at build time)
ARG GIT_COMMIT_HASH
ARG DATABASE_URL
ARG EMAIL_SERVER_HOST
ARG EMAIL_SERVER_PORT
ARG EMAIL_SERVER_USER
ARG EMAIL_SERVER_PASSWORD
ARG EMAIL_FROM
ARG NEXTAUTH_URL
ARG AUTH_URL
ARG NEXTAUTH_SECRET
ARG AUTH_TRUST_HOST
ARG GOOGLE_CLIENT_ID
ARG GOOGLE_CLIENT_SECRET
ARG AZURE_AD_CLIENT_ID
ARG AZURE_AD_CLIENT_SECRET
ARG AZURE_AD_TENANT_ID

# Set all environment variables
ENV GIT_COMMIT_HASH=$GIT_COMMIT_HASH \
    DATABASE_URL=$DATABASE_URL \
    EMAIL_SERVER_HOST=$EMAIL_SERVER_HOST \
    EMAIL_SERVER_PORT=$EMAIL_SERVER_PORT \
    EMAIL_SERVER_USER=$EMAIL_SERVER_USER \
    EMAIL_SERVER_PASSWORD=$EMAIL_SERVER_PASSWORD \
    EMAIL_FROM=$EMAIL_FROM \
    NEXTAUTH_URL=$NEXTAUTH_URL \
    AUTH_URL=$AUTH_URL \
    NEXTAUTH_SECRET=$NEXTAUTH_SECRET \
    AUTH_TRUST_HOST=$AUTH_TRUST_HOST \
    GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID \
    GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET \
    AZURE_AD_CLIENT_ID=$AZURE_AD_CLIENT_ID \
    AZURE_AD_CLIENT_SECRET=$AZURE_AD_CLIENT_SECRET \
    AZURE_AD_TENANT_ID=$AZURE_AD_TENANT_ID \
    NEXT_TELEMETRY_DISABLED=1

# Clear any potential caches before starting
RUN rm -rf /tmp/* /var/cache/* /root/.npm /root/.cache || true

# 1) Install deps with fresh cache
COPY package*.json ./
RUN npm cache clean --force && \
    npm ci --no-cache --prefer-offline=false

# 2) Copy source
COPY . .

# Clear any existing Next.js build artifacts
RUN rm -rf .next node_modules/.cache dist build || true

# Safety nets (keep helpers present if repo missed them)
RUN /bin/sh -eu -c '\
  if [ ! -f src/lib/utils.ts ]; then \
    mkdir -p src/lib; \
    printf "%s\n" \
      "import { type ClassValue } from \"clsx\";" \
      "import clsx from \"clsx\";" \
      "import { twMerge } from \"tailwind-merge\";" \
      "export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }" \
      > src/lib/utils.ts; \
  fi \
'

RUN /bin/sh -eu -c '\
  if [ ! -f src/components/ui/input.tsx ]; then \
    mkdir -p src/components/ui; \
    printf "%s\n" \
      "import * as React from \"react\";" \
      "import { cn } from \"@/lib/utils\";" \
      "export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}" \
      "export const Input = React.forwardRef<HTMLInputElement, InputProps>((" \
      "  { className, ...props }, ref) => (" \
      "    <input ref={ref} className={cn(\"flex h-9 w-full rounded-md border bg-white/90 dark:bg-neutral-900 px-3 py-2 text-sm outline-none\", className)} {...props} />" \
      "  )" \
      ");" \
      "Input.displayName = \"Input\";" \
      "export default Input;" \
      > src/components/ui/input.tsx; \
  fi \
'

# 3) Prisma client generation with fresh cache
RUN npx prisma generate --no-engine-cache

# 4) Next.js build with cache busting - force unique build ID
RUN echo "Building with CACHEBUST: $CACHEBUST" && \
    echo "Building with COMMIT: $GIT_COMMIT_HASH" && \
    NEXT_BUILD_ID="${GIT_COMMIT_HASH}-${CACHEBUST}" npm run build

# Log build output for verification
RUN echo "Build complete. Listing output:" && \
    ls -la .next/standalone/ || true && \
    ls -la .next/static/ || true

# ============================
# Stage 2: Runtime
# ============================
FROM node:18-bullseye-slim AS runner
WORKDIR /app

# Pass through cache bust to runtime for verification
ARG CACHEBUST=1
ARG GIT_COMMIT_HASH
ENV CACHEBUST=$CACHEBUST \
    GIT_COMMIT_HASH=$GIT_COMMIT_HASH

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# Tools + system CA
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl openssl \
 && rm -rf /var/lib/apt/lists/*

# Install the current RDS trust bundle
RUN set -eux; \
  dest="/etc/ssl/certs/rds-ca.pem"; \
  curl -fsSL "https://truststore.pki.rds.amazonaws.com/ca-central-1/ca-bundle.pem" -o "$dest" \
  || curl -fsSL "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem" -o "$dest"; \
  chmod 0644 "$dest"; \
  grep -q "BEGIN CERTIFICATE" "$dest"; \
  ln -sf "$dest" /etc/ssl/certs/rds-combined-ca-bundle.pem

# Make Node trust the bundle globally
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/rds-ca.pem

# Copy Next.js app files from builder
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma files (defensive)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Add build info file for verification
RUN echo "{\"cachebust\":\"$CACHEBUST\",\"commit\":\"$GIT_COMMIT_HASH\",\"built\":\"$(date -u +%Y-%m-%dT%H:%M:%SZ)\"}" > /app/build-info.json

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/api/health || exit 1

EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
