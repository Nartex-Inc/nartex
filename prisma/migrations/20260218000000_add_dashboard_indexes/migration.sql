-- Dashboard query optimization: add indexes on Prextra DMS-replicated tables
-- These indexes turn 6-table JOIN full-table scans into index lookups.
-- NOTE: Indexes survive DMS CDC replication but are lost on full table reload.

-- InvHeader: main WHERE filter (cieid + date range)
CREATE INDEX  IF NOT EXISTS "InvHeader_cieid_InvDate_idx"
  ON "sinto"."InvHeader" ("cieid", "InvDate");

-- InvHeader: FK joins
CREATE INDEX  IF NOT EXISTS "InvHeader_srid_idx"
  ON "sinto"."InvHeader" ("srid");
CREATE INDEX  IF NOT EXISTS "InvHeader_custid_idx"
  ON "sinto"."InvHeader" ("custid");

-- InvDetail: join key + FK
CREATE INDEX  IF NOT EXISTS "InvDetail_invnbr_cieid_idx"
  ON "sinto"."InvDetail" ("invnbr", "cieid");
CREATE INDEX  IF NOT EXISTS "InvDetail_Itemid_idx"
  ON "sinto"."InvDetail" ("Itemid");

-- Dimension tables
CREATE INDEX  IF NOT EXISTS "Salesrep_SRId_idx"
  ON "sinto"."Salesrep" ("SRId");
CREATE INDEX  IF NOT EXISTS "Customers_CustId_idx"
  ON "sinto"."Customers" ("CustId");
CREATE INDEX  IF NOT EXISTS "Products_ProdId_CieID_idx"
  ON "sinto"."Products" ("ProdId", "CieID");
