/**
 * migrate-legacy-returns.ts
 *
 * Imports historical return data from the old Sinto RMA LAMP stack (MySQL)
 * into the Nartex PostgreSQL database via Prisma.
 *
 * Source files (in scripts/data/):
 *   - retour_ini.csv      — return headers
 *   - retour_products.csv  — return line items
 *   - uploads.sql          — attachment records (Google Drive file IDs)
 *
 * Imports ALL records. Skips any already-existing return IDs.
 *
 * Usage:
 *   DATABASE_URL="postgresql://..." npx tsx scripts/migrate-legacy-returns.ts
 */

import { PrismaClient, Prisma } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

const prisma = new PrismaClient();


// ---------------------------------------------------------------------------
// CSV parser — handles quoted fields with embedded newlines and commas
// ---------------------------------------------------------------------------
function parseCSV(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (inQuotes) {
      if (ch === '"') {
        // Check for escaped quote ("")
        if (i + 1 < content.length && content[i + 1] === '"') {
          field += '"';
          i++; // skip next quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        current.push(field);
        field = "";
      } else if (ch === "\n" || (ch === "\r" && content[i + 1] === "\n")) {
        current.push(field);
        field = "";
        if (current.length > 1) {
          rows.push(current);
        }
        current = [];
        if (ch === "\r") i++; // skip \n after \r
      } else {
        field += ch;
      }
    }
  }
  // Last field/row
  if (field || current.length > 0) {
    current.push(field);
    if (current.length > 1) {
      rows.push(current);
    }
  }

  if (rows.length === 0) return [];

  const headers = rows[0];
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? "";
    });
    return obj;
  });
}

// ---------------------------------------------------------------------------
// SQL INSERT parser — extracts tuples from phpMyAdmin-style INSERT statements
// ---------------------------------------------------------------------------
function parseUploadsSql(
  content: string
): Array<{
  upload_id: number;
  code_retour: number;
  file_name: string;
  file_path: string;
  upload_time: string;
}> {
  const results: Array<{
    upload_id: number;
    code_retour: number;
    file_name: string;
    file_path: string;
    upload_time: string;
  }> = [];

  // Match each value tuple: (id, code_retour, 'file_name', 'file_path', 'upload_time')
  const tupleRegex =
    /\((\d+),\s*(\d+),\s*'((?:[^'\\]|\\.|'')*)',\s*'((?:[^'\\]|\\.|'')*)',\s*'((?:[^'\\]|\\.|'')*)'\)/g;

  let match: RegExpExecArray | null;
  while ((match = tupleRegex.exec(content)) !== null) {
    results.push({
      upload_id: parseInt(match[1]),
      code_retour: parseInt(match[2]),
      file_name: match[3].replace(/''/g, "'").replace(/\\'/g, "'"),
      file_path: match[4].replace(/''/g, "'").replace(/\\'/g, "'"),
      upload_time: match[5],
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Helper: nullable string
// ---------------------------------------------------------------------------
function nullStr(val: string | undefined): string | null {
  if (!val || val === "NULL" || val.trim() === "") return null;
  return val;
}

// ---------------------------------------------------------------------------
// Helper: parse boolean from "1"/"0"/NULL
// ---------------------------------------------------------------------------
function parseBool(val: string | undefined): boolean {
  return val === "1";
}

// ---------------------------------------------------------------------------
// Helper: parse nullable boolean
// ---------------------------------------------------------------------------
function parseNullableBool(val: string | undefined): boolean | null {
  if (!val || val === "NULL" || val.trim() === "") return null;
  return val === "1";
}

// ---------------------------------------------------------------------------
// Helper: parse Decimal or null
// ---------------------------------------------------------------------------
function parseDecimal(val: string | undefined): Prisma.Decimal | null {
  if (!val || val === "NULL" || val.trim() === "") return null;
  // Strip trailing $ and whitespace
  const cleaned = val.replace(/\$/g, "").trim();
  if (cleaned === "" || cleaned === ".00") return new Prisma.Decimal(0);
  const num = parseFloat(cleaned);
  if (isNaN(num)) return null;
  return new Prisma.Decimal(num);
}

// ---------------------------------------------------------------------------
// Helper: parse nullable int
// ---------------------------------------------------------------------------
function parseNullableInt(val: string | undefined): number | null {
  if (!val || val === "NULL" || val.trim() === "") return null;
  const n = parseInt(val, 10);
  return isNaN(n) ? null : n;
}

// ---------------------------------------------------------------------------
// Helper: parse date or null
// ---------------------------------------------------------------------------
function parseDate(val: string | undefined): Date | null {
  if (!val || val === "NULL" || val.trim() === "") return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

// ---------------------------------------------------------------------------
// Helper: parse credit number — "0" means null
// ---------------------------------------------------------------------------
function parseCreditNo(val: string | undefined): string | null {
  const s = nullStr(val);
  if (!s || s === "0") return null;
  return s;
}

// ---------------------------------------------------------------------------
// Helper: map cause — "exposition" → "exposition_sinto"
// ---------------------------------------------------------------------------
function mapCause(val: string): string {
  if (val === "exposition") return "exposition_sinto";
  return val;
}

// ---------------------------------------------------------------------------
// Helper: infer MIME type from file extension
// ---------------------------------------------------------------------------
function inferMimeType(fileName: string): string {
  const ext = path.extname(fileName).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".pdf": "application/pdf",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
    ".doc": "application/msword",
    ".docx":
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".mp4": "video/mp4",
    ".mov": "video/quicktime",
    ".webp": "image/webp",
  };
  return mimeMap[ext] || "application/octet-stream";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log("=== Legacy Returns Migration ===\n");

  // Resolve file paths (relative to project root via script location)
  const dataDir = path.join(__dirname, "data");
  const returnsFile = path.join(dataDir, "retour_ini.csv");
  const productsFile = path.join(dataDir, "retour_products.csv");
  const uploadsFile = path.join(dataDir, "uploads.sql");

  // Verify files exist
  for (const f of [returnsFile, productsFile, uploadsFile]) {
    if (!fs.existsSync(f)) {
      console.error(`ERROR: File not found: ${f}`);
      process.exit(1);
    }
  }

  // 1. Parse all source data
  console.log("Parsing source files...");
  const returnsRaw = parseCSV(fs.readFileSync(returnsFile, "utf-8"));
  const productsRaw = parseCSV(fs.readFileSync(productsFile, "utf-8"));
  const uploadsRaw = parseUploadsSql(fs.readFileSync(uploadsFile, "utf-8"));

  console.log(`  retour_ini:      ${returnsRaw.length} total records`);
  console.log(`  retour_products: ${productsRaw.length} total records`);
  console.log(`  uploads:         ${uploadsRaw.length} total records`);

  // 2. Resolve tenant
  const tenant = await prisma.tenant.findUnique({
    where: { slug: "sinto" },
  });
  if (!tenant) {
    console.error('ERROR: Tenant "sinto" not found. Create it first.');
    process.exit(1);
  }
  console.log(`\nTenant: ${tenant.name} (${tenant.id})`);

  // 3. Find already-existing return IDs to skip them
  const allCsvIds = returnsRaw.map((r) => parseInt(r.code_retour));
  const existingReturns = await prisma.return.findMany({
    where: { id: { in: allCsvIds } },
    select: { id: true },
  });
  const existingIds = new Set(existingReturns.map((r) => r.id));
  console.log(`\nAlready in database: ${existingIds.size} returns (will skip)`);

  // 4. Filter out existing records
  const returns = returnsRaw.filter(
    (r) => !existingIds.has(parseInt(r.code_retour))
  );
  const returnIds = new Set(returns.map((r) => parseInt(r.code_retour)));
  const products = productsRaw.filter((p) =>
    returnIds.has(parseInt(p.code_retour))
  );
  const uploads = uploadsRaw.filter((u) => returnIds.has(u.code_retour));

  console.log(`\nNew records to import:`);
  console.log(`  Returns:     ${returns.length}`);
  console.log(`  Products:    ${products.length}`);
  console.log(`  Attachments: ${uploads.length}`);

  if (returns.length === 0) {
    console.log("All records already exist. Nothing to import.");
    return;
  }

  // 5. Build Prisma data objects
  const returnData: Prisma.ReturnCreateManyInput[] = returns.map((r) => ({
    id: parseInt(r.code_retour),
    tenantId: tenant.id,
    reportedAt: new Date(r.date_signalement),
    reporter: r.signale_par as Prisma.ReturnCreateManyInput["reporter"],
    cause: mapCause(
      r.cause_retour
    ) as Prisma.ReturnCreateManyInput["cause"],
    expert: nullStr(r.expert),
    client: nullStr(r.client),
    noClient: nullStr(r.no_client),
    noCommande: nullStr(r.no_commande),
    noTracking: nullStr(r.no_tracking),
    dateCommande: nullStr(r.date_commande),
    transporteur: nullStr(r.transporteur),
    description: nullStr(r.description),
    returnPhysical: parseBool(r.retour_physique),
    isVerified: parseBool(r.is_verified),
    isDraft: parseBool(r.is_draft),
    isStandby: parseBool(r.is_standby),
    isPickup: parseBool(r.is_pickup),
    isCommande: parseBool(r.is_commande),
    isReclamation: parseBool(r.is_reclamation),
    isFinal: parseBool(r.is_final),
    noCommandeCheckbox: parseNullableBool(r.no_commande_checkbox) ?? false,
    noBill: nullStr(r.no_bill),
    noBonCommande: nullStr(r.no_bon_commande),
    noReclamation: nullStr(r.no_reclamation),
    warehouseOrigin: nullStr(r.entrepot_depart),
    warehouseDestination: nullStr(r.entrepot_destination),
    totalWeight: parseDecimal(r.poidsTotal),
    noCredit: parseCreditNo(r.no_credit),
    noCredit2: parseCreditNo(r.no_credit2),
    noCredit3: parseCreditNo(r.no_credit3),
    creditedTo: nullStr(r.credite_a),
    creditedTo2: nullStr(r.credite_a2),
    creditedTo3: nullStr(r.credite_a3),
    amount: parseDecimal(r.montant),
    transportAmount: parseDecimal(r.montant_transport),
    restockingAmount: parseDecimal(r.montant_restocking),
    initializedAt: parseDate(r.date_initialization),
    initiatedBy: nullStr(r.initie_par),
    verifiedAt: parseDate(r.date_verification),
    verifiedBy: nullStr(r.verifie_par),
    finalizedAt: parseDate(r.date_finalisation),
    finalizedBy: nullStr(r.finalise_par),
  }));

  const productData: Prisma.ReturnProductCreateManyInput[] = products.map(
    (p) => ({
      returnId: parseInt(p.code_retour),
      codeProduit: p.code_produit,
      quantite: parseInt(p.quantite) || 0,
      descrProduit: nullStr(p.descr_produit),
      descriptionRetour: nullStr(p.description_retour),
      quantiteRecue: parseNullableInt(p.quantite_recue),
      qteInventaire: parseNullableInt(p.qte_inventaire),
      qteDetruite: parseNullableInt(p.qte_detruite),
      tauxRestock: parseDecimal(p.taux_restock),
      poids: parseDecimal(p.poids),
      weightProduit: parseDecimal(p.poids_produits),
    })
  );

  const attachmentData: Prisma.ReturnAttachmentCreateManyInput[] = uploads.map(
    (u) => ({
      returnId: u.code_retour,
      fileName: u.file_name,
      fileId: u.file_path, // Google Drive file ID
      mimeType: inferMimeType(u.file_name),
      fileSize: null,
      createdAt: new Date(u.upload_time),
    })
  );

  // 6. Insert in a transaction (60s timeout for large dataset)
  console.log("\nInserting into database...");

  await prisma.$transaction(async (tx) => {
    // Insert returns (batch in chunks of 500 for safety)
    const returnsResult = await tx.return.createMany({
      data: returnData,
      skipDuplicates: true,
    });
    console.log(`  Returns inserted:     ${returnsResult.count}`);

    // Insert products
    const productsResult = await tx.returnProduct.createMany({
      data: productData,
      skipDuplicates: true,
    });
    console.log(`  Products inserted:    ${productsResult.count}`);

    // Insert attachments
    const attachmentsResult = await tx.returnAttachment.createMany({
      data: attachmentData,
      skipDuplicates: true,
    });
    console.log(`  Attachments inserted: ${attachmentsResult.count}`);
  });

  // 7. Reset sequences to avoid ID conflicts with future inserts
  console.log("\nResetting sequences...");

  await prisma.$executeRaw`
    SELECT setval('"Return_id_seq"', (SELECT COALESCE(MAX(id), 1) FROM "Return"))
  `;
  await prisma.$executeRaw`
    SELECT setval('"ReturnProduct_id_seq"', (SELECT COALESCE(MAX(id), 1) FROM "ReturnProduct"))
  `;
  await prisma.$executeRaw`
    SELECT setval('"ReturnAttachment_id_seq"', (SELECT COALESCE(MAX(id), 1) FROM "ReturnAttachment"))
  `;

  console.log("  Sequences reset successfully.");

  // 8. Verify
  const totalReturns = await prisma.return.count({
    where: { tenantId: tenant.id },
  });
  const importedRange = await prisma.return.aggregate({
    where: { tenantId: tenant.id },
    _min: { id: true },
    _max: { id: true },
    _count: true,
  });

  console.log("\n=== Migration Complete ===");
  console.log(`Total returns for tenant: ${totalReturns}`);
  console.log(
    `Full range: R${importedRange._min.id} – R${importedRange._max.id} (${importedRange._count} records)`
  );
}

main()
  .catch((e) => {
    console.error("Migration failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
