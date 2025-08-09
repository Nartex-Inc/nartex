# ================================================================
# Stage 1: Dependencies & Build
# ================================================================
FROM node:18-bullseye AS builder

# Set working directory
WORKDIR /app

# --- FIX: DECLARE ALL BUILD ARGUMENTS ---
# These MUST match the --build-arg flags in your buildspec.yml
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

# --- FIX: SET BUILD-TIME ENVIRONMENT VARIABLES ---
# This makes the ARGs available to the `npm run build` command.
ENV GIT_COMMIT_HASH=$GIT_COMMIT_HASH
ENV DATABASE_URL=$DATABASE_URL
ENV EMAIL_SERVER_HOST=$EMAIL_SERVER_HOST
ENV EMAIL_SERVER_PORT=$EMAIL_SERVER_PORT
ENV EMAIL_SERVER_USER=$EMAIL_SERVER_USER
ENV EMAIL_SERVER_PASSWORD=$EMAIL_SERVER_PASSWORD
ENV EMAIL_FROM=$EMAIL_FROM
ENV NEXTAUTH_URL=$NEXTAUTH_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV GOOGLE_CLIENT_ID=$GOOGLE_CLIENT_ID
ENV GOOGLE_CLIENT_SECRET=$GOOGLE_CLIENT_SECRET
ENV AZURE_AD_CLIENT_ID=$AZURE_AD_CLIENT_ID
ENV AZURE_AD_CLIENT_SECRET=$AZURE_AD_CLIENT_SECRET
ENV AZURE_AD_TENANT_ID=$AZURE_AD_TENANT_ID

# 1. Install dependencies
COPY package*.json ./
RUN npm ci

# 2. Copy the rest of the application source code
COPY . .

# 2. Copy the rest of the application source code
COPY . .

# --- SAFETY NET: ensure cn() helper exists ---
RUN /bin/sh -lc 'if [ ! -f src/lib/utils.ts ]; then \
  mkdir -p src/lib && cat > src/lib/utils.ts << "TS"; \
import { type ClassValue } from "clsx";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
TS
fi'

# --- SAFETY NET: ensure Input component exists (if shadcn generation didn’t run) ---
RUN /bin/sh -lc 'if [ ! -f src/components/ui/input.tsx ]; then \
  mkdir -p src/components/ui && cat > src/components/ui/input.tsx << "TSX"; \
import * as React from "react";
import { cn } from "@/lib/utils";
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn("flex h-9 w-full rounded-md border bg-white/90 dark:bg-neutral-900 px-3 py-2 text-sm outline-none", className)}
      {...props}
    />
  )
);
Input.displayName = "Input";
export default Input;
TSX
fi'


# 3. Generate Prisma Client
RUN npx prisma generate

# 4. Build the Next.js application for production
# This command will now succeed because all ENV variables are available.
RUN npm run build


# ================================================================
# Stage 2: Production Image
# ================================================================
FROM node:18-bullseye-slim AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Install openssl for Prisma (This is good practice)
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# 1. Copy over the standalone application output
COPY --from=builder /app/.next/standalone ./

# 2. Copy over the public assets
COPY --from=builder /app/public ./public

# 3. Copy over the compiled static assets
COPY --from=builder /app/.next/static ./.next/static

# 4. Copy Prisma schema and client
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# --- FIX: REMOVED THE .env.production COPY ---
# This file is no longer needed. The environment variables will be
# provided by your ECS Task Definition at runtime.

# Expose the port the app will run on
EXPOSE 3000

# Start the Node.js server
CMD ["node", "server.js"]
