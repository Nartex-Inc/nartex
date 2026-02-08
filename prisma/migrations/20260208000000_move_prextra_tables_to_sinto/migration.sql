-- Create the sinto schema
CREATE SCHEMA IF NOT EXISTS "sinto";

-- Move all Prextra ERP tables from public to sinto
-- Using DO block to gracefully skip tables that may not exist yet
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'Items', 'Customers', 'SOHeader', 'Salesrep', 'Sites',
    'carriers', 'ShipmentHdr', 'InvHeader', 'InvDetail',
    'Shipto', '_City', '_CitySetting', '_TransportChartDTL',
    'Products', 'itemtype', 'PriceList', 'itempricerange'
  ])
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('ALTER TABLE "public".%I SET SCHEMA "sinto"', tbl);
      RAISE NOTICE 'Moved table % to sinto schema', tbl;
    ELSE
      RAISE NOTICE 'Table % not found in public schema, skipping', tbl;
    END IF;
  END LOOP;
END $$;
