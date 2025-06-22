// src/scripts/delete-user.ts

// REUSE the existing Prisma client from your application's lib folder.
// This resolves the "Cannot redeclare 'prisma'" build error.
const { default: prisma } = require('../lib/prisma');

// 🔴 IMPORTANT: CHANGE THIS TO THE CORRECT EMAIL ADDRESS.
const emailToDelete = 'n.labranche@sintoexpert.com';

async function main() {
  console.log(`Starting deletion process for user: ${emailToDelete}`);

  const user = await prisma.user.findUnique({
    where: { email: emailToDelete },
  });

  if (!user) {
    console.log(`User with email ${emailToDelete} not found. Exiting.`);
    // We use a clean exit code 0 because not finding the user is not a build failure.
    process.exit(0);
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
    // The main prisma client does not need to be disconnected in a short-lived script.
    console.log('Script finished.');
  });
