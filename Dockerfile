# ============================
# Stage 1: Build
# ============================
FROM node:18-bullseye AS builder
WORKDIR /app

# Build args (Next may read some at build time)
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
    NEXT_TELEMETRY_DISABLED=1

# 1) Install deps
COPY package*.json ./
RUN npm ci

# 2) Copy source
COPY . .

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

# 3) Prisma client
RUN npx prisma generate

# 4) Next build (produces .next/standalone with server.js)
RUN npm run build

# ============================
# Stage 2: Runtime
# ============================
FROM node:18-bullseye-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# Tools + system CA
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl openssl \
 && rm -rf /var/lib/apt/lists/*

# ---- Install the current RDS trust bundle (prefer regional, fallback to global) ----
# We write it to /etc/ssl/certs/rds-ca.pem and ALSO symlink to the legacy combined name
# so existing PGSSLROOTCERT=/etc/ssl/certs/rds-combined-ca-bundle.pem keeps working.
RUN set -eux; \
  dest="/etc/ssl/certs/rds-ca.pem"; \
  curl -fsSL "https://truststore.pki.rds.amazonaws.com/ca-central-1/ca-bundle.pem" -o "$dest" \
  || curl -fsSL "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem" -o "$dest"; \
  chmod 0644 "$dest"; \
  grep -q "BEGIN CERTIFICATE" "$dest"; \
  ln -sf "$dest" /etc/ssl/certs/rds-combined-ca-bundle.pem

# Make Node trust the bundle globally (pg, fetch, etc.)
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/rds-ca.pem

# --- Next.js app files ---
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma (defensive)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

EXPOSE 3000
CMD ["node", "server.js"]

