import { PrismaClient } from '@prisma/client';
// You might need to add password hashing in a real app
// import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log(`Start seeding ...`);

  // Create the main Nartex tenant
  const nartexTenant = await prisma.tenant.create({
    data: {
      name: 'Nartex',
    },
  });
  console.log(`Created tenant with id: ${nartexTenant.id}`);

  // Create a default admin user
  // In a real app, you should hash the password!
  // const hashedPassword = await bcrypt.hash('your-secure-password', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@nartex.ca',
      name: 'Admin User',
      role: 'ADMIN', // Assuming you have a role field
      // password: hashedPassword,
      password: 'Password123!', // USE A TEMPORARY, SECURE PASSWORD
    },
  });
  console.log(`Created admin user with id: ${adminUser.id}`);

  // Link the admin user to the Nartex tenant
  await prisma.userTenant.create({
    data: {
      userId: adminUser.id,
      tenantId: nartexTenant.id,
      role: 'ADMIN',
    },
  });
  console.log(`Linked admin user to Nartex tenant`);

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
