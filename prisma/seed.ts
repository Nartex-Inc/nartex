const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  const nartexTenant = await prisma.tenant.upsert({
    where: { name: 'Nartex' },
    update: {},
    create: {
      name: 'Nartex',
    },
  });
  console.log(`Ensured Nartex tenant exists with id: ${nartexTenant.id}`);
  
  console.log(`Seeding finished.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
