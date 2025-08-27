-- CreateEnum
CREATE TYPE "ProductLifecycleStage" AS ENUM ('DEMANDE_IDEATION', 'EVALUATION_COUT_POTENTIEL', 'PROTOTYPAGE', 'MISE_EN_FONCTION_DEVELOPPEMENT', 'PLANIFICATION_PRODUIT_FINI', 'MISE_EN_MARCHE', 'VIE_DU_PRODUIT');

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "ext_expires_in" INTEGER;

-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_tenants" (
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tenants_pkey" PRIMARY KEY ("userId","tenantId")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "stage" "ProductLifecycleStage" NOT NULL,
    "tenantId" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sharepoint_nodes" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT,
    "icon" TEXT,
    "restricted" BOOLEAN NOT NULL DEFAULT false,
    "highSecurity" BOOLEAN NOT NULL DEFAULT false,
    "parentId" TEXT,
    "permissions" JSONB,
    "tenantId" TEXT NOT NULL,

    CONSTRAINT "sharepoint_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_name_key" ON "tenants"("name");

-- CreateIndex
CREATE INDEX "accounts_provider_account_id_idx" ON "accounts"("provider_account_id");

-- AddForeignKey
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_tenants" ADD CONSTRAINT "user_tenants_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sharepoint_nodes" ADD CONSTRAINT "sharepoint_nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "sharepoint_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sharepoint_nodes" ADD CONSTRAINT "sharepoint_nodes_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
