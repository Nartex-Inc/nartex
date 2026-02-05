# ============================
# Stage 1: Build
# ============================
FROM node:18-bullseye AS builder
WORKDIR /app

# ---- Build args (only what you truly need at build time)
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
ARG GOOGLE_CLIENT_EMAIL
ARG GOOGLE_PRIVATE_KEY
ARG GOOGLE_DRIVE_FOLDER_ID
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

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
    GOOGLE_CLIENT_EMAIL=$GOOGLE_CLIENT_EMAIL \
    GOOGLE_PRIVATE_KEY=$GOOGLE_PRIVATE_KEY \
    GOOGLE_DRIVE_FOLDER_ID=$GOOGLE_DRIVE_FOLDER_ID \
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY \
    NEXT_TELEMETRY_DISABLED=1

# 1) Dependencies
COPY package*.json ./
RUN npm ci

# 2) Copy source
COPY . .

# 3) Safety stubs (no-op if files already exist)
RUN /bin/sh -eu -c '\
  if [ ! -f src/lib/utils.ts ]; then \
    mkdir -p src/lib; \
    printf "%s\n" \
      "import { type ClassValue } from \"clsx\";" \
      "import clsx from \"clsx\";" \
      "import { twMerge } from \"tailwind-merge\";" \
      "export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }" \
      > src/lib/utils.ts; \
  fi'

RUN /bin/sh -eu -c '\
  if [ ! -f src/components/ui/input.tsx ]; then \
    mkdir -p src/components/ui; \
    printf "%s\n" \
      "import * as React from \"react\";" \
      "import { cn } from \"@/lib/utils\";" \
      "export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}" \
      "export const Input = React.forwardRef<HTMLInputElement, InputProps>(({ className, ...props }, ref) => (" \
      "  <input ref={ref} className={cn(\"flex h-9 w-full rounded-md border bg-white/90 dark:bg-neutral-900 px-3 py-2 text-sm outline-none\", className)} {...props} />" \
      "));" \
      "Input.displayName = \"Input\";" \
      "export default Input;" \
      > src/components/ui/input.tsx; \
  fi'

# 4) Prisma client (no DB connection required)
RUN npx prisma generate

# 5) Pre-build assert: page exists in repo
RUN test -f src/app/dashboard/sharepoint/page.tsx \
  || (echo "❌ Missing source: src/app/dashboard/sharepoint/page.tsx" && exit 1)

# 6) Next build (standalone output)
RUN npm run build

# 7) Post-build asserts: verify compiled artifacts
RUN node -e "\
  const fs=require('fs');\
  const ex=p=>fs.existsSync(p);\
  const serverOk = ex('.next/standalone/server.js');\
  const pageOk = ex('.next/server/app/dashboard/sharepoint/page.js') || ex('.next/server/app/dashboard/sharepoint/page.mjs');\
  const apiRootOk = ex('.next/server/app/api/sharepoint/route.js') || ex('.next/server/app/api/sharepoint/route.mjs');\
  const apiIdOk = ex('.next/server/app/api/sharepoint/[id]/route.js') || ex('.next/server/app/api/sharepoint/[id]/route.mjs');\
  if(!serverOk)  { console.error('❌ Missing .next/standalone/server.js'); process.exit(1); }\
  if(!pageOk)    { console.error('❌ Missing compiled page for /dashboard/sharepoint'); process.exit(1); }\
  if(!apiRootOk) { console.error('❌ Missing compiled API /api/sharepoint'); process.exit(1); }\
  if(!apiIdOk)   { console.error('❌ Missing compiled API /api/sharepoint/[id]'); process.exit(1); }\
  console.log('✅ Compiled artifacts present: server + page + APIs.');\
"

# ============================
# Stage 2: Runtime
# ============================
FROM node:18-bullseye-slim AS runner
WORKDIR /app

# =================================================================
# START: NEW COMMAND TO ADD SSL CERTIFICATE
# =================================================================
COPY --from=builder /app/certs/rds-combined-ca-bundle.pem /etc/ssl/certs/rds-combined-ca-bundle.pem
# =================================================================
# END: NEW COMMAND
# =================================================================

# Copy the self-contained server, node_modules, and assets from the builder stage
COPY --from=builder /app/.next/standalone ./

# Copy static assets like CSS and JS bundles
COPY --from=builder /app/.next/static ./.next/static

# Copy public assets like images and fonts
COPY --from=builder /app/public ./public

# Set Node.js memory limit to prevent OOM kills
# Current ECS task: 512MB → limit heap to 384MB (leaves room for OS)
# RECOMMENDED: Increase ECS task memory to 1024MB+ and set this to 768
ENV NODE_OPTIONS="--max-old-space-size=384"

# Your CMD should then run the standalone server
CMD ["node", "server.js"]
