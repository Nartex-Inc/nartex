// prisma/seed.ts
// Seeds initial tenants and assigns all existing users + returns to SINTO

import { PrismaClient, Tenant } from "@prisma/client";

const prisma = new PrismaClient();

const TENANTS = [
  { name: "SINTO", slug: "sinto", plan: "Groupe", logo: "/sinto-logo.svg", prextraSchema: "sinto" },
  { name: "Prolab", slug: "prolab", plan: "Filiale", logo: "https://www.prolabtechnolub.com/images/site/logo_prolab_2025.png", prextraSchema: "prolab" },
  { name: "Lubri-Lab", slug: "lubrilab", plan: "Filiale", logo: null, prextraSchema: null },
  { name: "Otoprotec", slug: "otoprotec", plan: "Filiale", logo: null, prextraSchema: null },
];

async function main() {
  console.log("Seeding tenants...");

  // 1. Upsert tenants
  const tenantRecords: Tenant[] = [];
  for (const t of TENANTS) {
    const tenant = await prisma.tenant.upsert({
      where: { slug: t.slug },
      update: { name: t.name, plan: t.plan, logo: t.logo, prextraSchema: t.prextraSchema },
      create: { name: t.name, slug: t.slug, plan: t.plan, logo: t.logo, prextraSchema: t.prextraSchema },
    });
    tenantRecords.push(tenant);
    console.log(`  Tenant: ${tenant.name} (${tenant.id})`);
  }

  const sintoTenant = tenantRecords.find((t) => t.slug === "sinto")!;

  // 2. Assign all existing users to SINTO (skip if already linked)
  const users = await prisma.user.findMany({ select: { id: true, email: true } });
  console.log(`\nAssigning ${users.length} user(s) to SINTO...`);

  for (const user of users) {
    await prisma.userTenant.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: sintoTenant.id } },
      update: {},
      create: { userId: user.id, tenantId: sintoTenant.id },
    });
    console.log(`  ${user.email} -> SINTO`);
  }

  // 3. Assign admin user to ALL tenants
  const admin = await prisma.user.findUnique({
    where: { email: "n.labranche@sinto.ca" },
  });

  if (admin) {
    console.log("\nAssigning admin to all tenants...");
    for (const tenant of tenantRecords) {
      await prisma.userTenant.upsert({
        where: { userId_tenantId: { userId: admin.id, tenantId: tenant.id } },
        update: {},
        create: { userId: admin.id, tenantId: tenant.id },
      });
      console.log(`  ${admin.email} -> ${tenant.name}`);
    }
  }

  // 4. Assign all existing returns to SINTO (backfill tenant_id)
  const unassigned = await prisma.return.count({ where: { tenantId: "" } });
  if (unassigned > 0) {
    const result = await prisma.return.updateMany({
      where: { tenantId: "" },
      data: { tenantId: sintoTenant.id },
    });
    console.log(`\nBackfilled ${result.count} return(s) to SINTO tenant.`);
  } else {
    // Also handle any returns that might have been created without tenantId
    // after migration but before seed (NULL would fail schema, so check empty string)
    console.log("\nNo unassigned returns to backfill.");
  }

  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
