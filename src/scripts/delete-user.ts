// src/scripts/delete-user.ts

import { PrismaClient } from '@prisma/client';

// The email address of the user you want to delete.
// 🔴 IMPORTANT: CHANGE THIS TO THE CORRECT EMAIL ADDRESS.
const emailToDelete = 'your-entra-id-email@example.com';

const prisma = new PrismaClient();

async function main() {
  console.log(`Starting deletion process for user: ${emailToDelete}`);

  // Find the user by their email address
  const user = await prisma.user.findUnique({
    where: { email: emailToDelete },
  });

  if (!user) {
    console.log(`User with email ${emailToDelete} not found. Exiting.`);
    return;
  }

  console.log(`Found user with ID: ${user.id}`);

  // 1. Delete the associated Account records first to avoid foreign key errors.
  const deletedAccounts = await prisma.account.deleteMany({
    where: { userId: user.id },
  });
  console.log(`Deleted ${deletedAccounts.count} associated account(s).`);
  
  // 2. Now, delete the user.
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
