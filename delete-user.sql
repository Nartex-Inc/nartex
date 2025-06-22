-- Step 1: Delete the linked Account record first.
DELETE FROM "Account"
WHERE "provider" = 'azure-ad' AND "userId" IN (
    SELECT id FROM "User" WHERE email = 'n.labranche@sintoexpert.com'
);

-- Step 2: Delete the User record.
DELETE FROM "User" 
WHERE email = 'n.labranche@sintoexpert.com';
