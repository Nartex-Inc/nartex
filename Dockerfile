# ================================================================
# Stage 1: Dependencies & Build
# ================================================================
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# --- FIX: DECLARE ALL BUILD ARGUMENTS ---
# These will be passed in from the buildspec.yml file.
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

# 3. Generate Prisma Client
RUN npx prisma generate

# 4. Build the Next.js application for production
# This command will now succeed because all ENV variables are available.
RUN npm run build


# ================================================================
# Stage 2: Production Image
# ================================================================
FROM node:18-alpine AS runner

WORKDIR /app

# Set production environment variables
ENV NODE_ENV=production
ENV PORT=3000

# --- FIX: DECLARE AND SET RUNTIME ENVIRONMENT VARIABLES ---
# The final image also needs these variables to run the server.
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

# 1. Copy standalone output
COPY --from=builder /app/.next/standalone ./

# 2. Copy public assets
COPY --from=builder /app/public ./public

# 3. Copy static assets
COPY --from=builder /app/.next/static ./.next/static

# 4. Copy Prisma schema and client
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client

# --- FIX: REMOVED .env.production COPY ---
# We no longer need this file as we are using proper environment variables.

# Expose the port
EXPOSE 3000

# Start the server
CMD ["node", "server.js"]
