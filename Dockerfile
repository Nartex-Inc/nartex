# ============================
# Stage 1: Build
# ============================
FROM --platform=linux/arm64 node:20-bookworm AS builder
WORKDIR /app

# ---- Build args: ONLY values needed at compile time ----
# NEXT_PUBLIC_* vars get inlined into client JS bundles by webpack.
# All other secrets are injected at runtime via ECS Task Definition.
ARG GIT_COMMIT_HASH
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY

ENV GIT_COMMIT_HASH=$GIT_COMMIT_HASH \
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=$NEXT_PUBLIC_GOOGLE_MAPS_API_KEY \
    # Dummy URL for prisma generate (reads schema only, no DB connection)
    DATABASE_URL="postgresql://build:build@localhost:5432/build" \
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
FROM --platform=linux/arm64 node:20-bookworm-slim AS runner
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
# ECS task: 1024MB → limit heap to 768MB (leaves room for OS)
ENV NODE_OPTIONS="--max-old-space-size=768"

# Your CMD should then run the standalone server
CMD ["node", "server.js"]
