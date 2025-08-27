#!/usr/bin/env bash
# This script contains the entire build process.
# It will be called by the simplified buildspec.yaml.
set -euo pipefail

echo "--- PRE-BUILD PHASE ---"
echo "Cleaning cache and removing old files..."
npm cache clean --force
rm -f package-lock.json
rm -f src/lib/auth.ts || true

echo "Setting package versions..."
npm pkg set devDependencies.@eslint/eslintrc="^3.1.0"
npm pkg set dependencies.recharts="^2.12.7" dependencies.lucide-react="^0.452.0"

echo "Installing dependencies..."
npm install --no-audit --no-fund

echo "--- BUILD PHASE ---"
echo "Logging in to Docker Hub..."
echo "$DOCKERHUB_PASSWORD" | docker login --username "$DOCKERHUB_USERNAME" --password-stdin

echo "Applying database migrations..."
npx prisma migrate deploy

echo "Generating Prisma Client..."
npx prisma generate

echo "Building Docker image..."
COMMIT_HASH=$(git rev-parse --short HEAD)
ECR_IMAGE_URI="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com/$IMAGE_REPO_NAME"

docker build \
  --build-arg GIT_COMMIT_HASH="$COMMIT_HASH" \
  --build-arg DATABASE_URL="$DATABASE_URL" \
  --build-arg EMAIL_SERVER_HOST="$EMAIL_SERVER_HOST" \
  --build-arg EMAIL_SERVER_PORT="$EMAIL_SERVER_PORT" \
  --build-arg EMAIL_SERVER_USER="$EMAIL_SERVER_USER" \
  --build-arg EMAIL_SERVER_PASSWORD="$EMAIL_SERVER_PASSWORD" \
  --build-arg EMAIL_FROM="$EMAIL_FROM" \
  --build-arg NEXTAUTH_URL="$NEXTAUTH_URL" \
  --build-arg AUTH_URL="$NEXTAUTH_URL" \
  --build-arg NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
  --build-arg AUTH_TRUST_HOST="true" \
  --build-arg GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  --build-arg GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
  --build-arg AZURE_AD_CLIENT_ID="$AZURE_AD_CLIENT_ID" \
  --build-arg AZURE_AD_CLIENT_SECRET="$AZURE_AD_CLIENT_SECRET" \
  --build-arg AZURE_AD_TENANT_ID="$AZURE_AD_TENANT_ID" \
  -t "$ECR_IMAGE_URI:$COMMIT_HASH" \
  -t "$ECR_IMAGE_URI:latest" .

echo "Pushing image to ECR..."
aws ecr get-login-password --region "$AWS_DEFAULT_REGION" | docker login --username AWS --password-stdin "$ECR_IMAGE_URI"
docker push "$ECR_IMAGE_URI:$COMMIT_HASH"
docker push "$ECR_IMAGE_URI:latest"

echo "Creating image definitions file..."
printf '[{"name":"%s","imageUri":"%s:%s"}]' "$CONTAINER_NAME" "$ECR_IMAGE_URI" "$COMMIT_HASH" > imagedefinitions.json
cat imagedefinitions.json

echo "--- BUILD SCRIPT COMPLETE ---"
