-- CreateTable
CREATE TABLE "customer_geo_cache" (
    "id" SERIAL NOT NULL,
    "tenant_slug" TEXT NOT NULL,
    "cust_id" INTEGER NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "address" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_geo_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "customer_geo_cache_tenant_slug_idx" ON "customer_geo_cache"("tenant_slug");

-- CreateIndex
CREATE UNIQUE INDEX "customer_geo_cache_tenant_slug_cust_id_key" ON "customer_geo_cache"("tenant_slug", "cust_id");
