// src/scripts/delete-user.ts

// Use require() for CommonJS compatibility
const { PrismaClient } = require('@prisma/client');

// 🔴 IMPORTANT: CHANGE THIS TO THE CORRECT EMAIL ADDRESS.
const emailToDelete = 'n.labranche@sintoexpert.com';

const prisma = new PrismaClient();

async function main() {
  console.log(`Starting deletion process for user: ${emailToDelete}`);

  const user = await prisma.user.findUnique({
    where: { email: emailToDelete },
  });

  if (!user) {
    console.log(`User with email ${emailToDelete} not found. Exiting.`);
    return;
  }

  console.log(`Found user with ID: ${user.id}`);

  const deletedAccounts = await prisma.account.deleteMany({
    where: { userId: user.id },
  });
  console.log(`Deleted ${deletedAccounts.count} associated account(s).`);
  
  await prisma.user.delete({
    where: { id: user.id },
  });
  console.log(`Successfully deleted user: ${emailToDelete}`);
}

main()
  .catch((e) => {
    console.error('An error occurred during the script execution:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log('Prisma client disconnected.');
  });
