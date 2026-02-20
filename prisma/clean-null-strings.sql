-- One-time cleanup: convert literal 'NULL' strings to actual NULL
-- Safe to run multiple times (idempotent)
UPDATE "Return" SET
  expert = NULLIF(expert, 'NULL'),
  client = NULLIF(client, 'NULL'),
  "noClient" = NULLIF("noClient", 'NULL'),
  "noCommande" = NULLIF("noCommande", 'NULL'),
  "noTracking" = NULLIF("noTracking", 'NULL'),
  "dateCommande" = NULLIF("dateCommande", 'NULL'),
  description = NULLIF(description, 'NULL'),
  transporteur = NULLIF(transporteur, 'NULL'),
  "noBill" = NULLIF("noBill", 'NULL'),
  "noBonCommande" = NULLIF("noBonCommande", 'NULL'),
  "noReclamation" = NULLIF("noReclamation", 'NULL'),
  "warehouseOrigin" = NULLIF("warehouseOrigin", 'NULL'),
  "warehouseDestination" = NULLIF("warehouseDestination", 'NULL'),
  "villeShipto" = NULLIF("villeShipto", 'NULL'),
  "noCredit" = NULLIF("noCredit", 'NULL'),
  "noCredit2" = NULLIF("noCredit2", 'NULL'),
  "noCredit3" = NULLIF("noCredit3", 'NULL'),
  "creditedTo" = NULLIF("creditedTo", 'NULL'),
  "creditedTo2" = NULLIF("creditedTo2", 'NULL'),
  "creditedTo3" = NULLIF("creditedTo3", 'NULL'),
  "initiatedBy" = NULLIF("initiatedBy", 'NULL'),
  "verifiedBy" = NULLIF("verifiedBy", 'NULL'),
  "finalizedBy" = NULLIF("finalizedBy", 'NULL')
WHERE
  expert = 'NULL' OR client = 'NULL' OR "noClient" = 'NULL' OR "noCommande" = 'NULL'
  OR "noTracking" = 'NULL' OR "dateCommande" = 'NULL' OR description = 'NULL'
  OR transporteur = 'NULL' OR "noBill" = 'NULL' OR "noBonCommande" = 'NULL'
  OR "noReclamation" = 'NULL' OR "warehouseOrigin" = 'NULL' OR "warehouseDestination" = 'NULL'
  OR "villeShipto" = 'NULL' OR "noCredit" = 'NULL' OR "noCredit2" = 'NULL'
  OR "noCredit3" = 'NULL' OR "creditedTo" = 'NULL' OR "creditedTo2" = 'NULL'
  OR "creditedTo3" = 'NULL' OR "initiatedBy" = 'NULL' OR "verifiedBy" = 'NULL'
  OR "finalizedBy" = 'NULL';
