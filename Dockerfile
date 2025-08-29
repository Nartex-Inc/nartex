# ============================
# Stage 1: Build
# ============================
FROM node:18-bullseye AS builder
WORKDIR /app

# ---- Build args (Next may read some at build time)
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

# 1) Install deps (clean, reproducible)
COPY package*.json ./
RUN npm ci

# 2) Copy source
COPY . .

# --- Safety nets (lightweight placeholders if a file is missing locally)
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

# 4) Pre-build asserts: the source **must** contain the page
RUN test -f src/app/dashboard/sharepoint/page.tsx \
  || (echo "❌ Missing source: src/app/dashboard/sharepoint/page.tsx" && exit 1)

# 5) Next build (standalone = server.js in .next/standalone)
RUN npm run build

# 6) Post-build asserts: verify compiled routes really exist
#    (Next.js may emit .js or .mjs depending on version/tooling — check both)
RUN node -e "\
  const fs=require('fs');\
  const mustExist=[\
    '.next/standalone/server.js',\
    '.next/server/app/dashboard/sharepoint/page.js',\
    '.next/server/app/dashboard/sharepoint/page.mjs',\
    '.next/server/app/api/sharepoint/route.js',\
    '.next/server/app/api/sharepoint/route.mjs',\
    '.next/server/app/api/sharepoint/[id]/route.js',\
    '.next/server/app/api/sharepoint/[id]/route.mjs'\
  ];\
  const candidates = new Set(mustExist); \
  const exists = p => fs.existsSync(p); \
  const compiledOk = [...candidates].some(p => exists('.next/server/app/dashboard/sharepoint/page.js') || exists('.next/server/app/dashboard/sharepoint/page.mjs'));\
  const apiRootOk  = exists('.next/server/app/api/sharepoint/route.js') || exists('.next/server/app/api/sharepoint/route.mjs');\
  const apiIdOk    = exists('.next/server/app/api/sharepoint/[id]/route.js') || exists('.next/server/app/api/sharepoint/[id]/route.mjs');\
  const serverOk   = exists('.next/standalone/server.js');\
  if(!serverOk){ console.error('❌ Missing .next/standalone/server.js'); process.exit(1); }\
  if(!compiledOk){ console.error('❌ Missing compiled page for /dashboard/sharepoint'); process.exit(1); }\
  if(!apiRootOk){ console.error('❌ Missing compiled API /api/sharepoint'); process.exit(1); }\
  if(!apiIdOk){ console.error('❌ Missing compiled API /api/sharepoint/[id]'); process.exit(1); }\
  console.log('✅ Compiled artifacts present: server + page + APIs.');\
"

# ============================
# Stage 2: Runtime
# ============================
FROM node:18-bullseye-slim AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    NEXT_TELEMETRY_DISABLED=1

# Minimal utilities & system CA certs
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl openssl \
 && rm -rf /var/lib/apt/lists/*

# ---- Install current RDS trust bundle (regional fallback -> global) ----
RUN set -eux; \
  dest="/etc/ssl/certs/rds-ca.pem"; \
  curl -fsSL "https://truststore.pki.rds.amazonaws.com/ca-central-1/ca-bundle.pem" -o "$dest" \
  || curl -fsSL "https://truststore.pki.rds.amazonaws.com/global/global-bundle.pem" -o "$dest"; \
  chmod 0644 "$dest"; \
  grep -q 'BEGIN CERTIFICATE' "$dest"; \
  ln -sf "$dest" /etc/ssl/certs/rds-combined-ca-bundle.pem

# Make Node trust the bundle globally (pg, fetch, etc.)
ENV NODE_EXTRA_CA_CERTS=/etc/ssl/certs/rds-ca.pem

# --- Next.js app files (standalone build) ---
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma runtime bits (defensive)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Optional: basic liveness check (HTTP 200/302 treated as success)
# HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -fsS http://localhost:3000/ || exit 1

EXPOSE 3000
CMD ["node", "server.js"]
