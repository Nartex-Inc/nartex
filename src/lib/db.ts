// lib/db.ts
import 'server-only';
import { Pool } from "pg";

declare global { var pgPool: Pool | undefined }

function buildPool(): Pool {
  const raw = process.env.RDS_CREDENTIALS || process.env.DATABASE_URL;
  if (!raw) throw new Error("Missing RDS_CREDENTIALS (or DATABASE_URL).");

  // Full URL provided
  if (/^postgres(ql)?:\/\//i.test(raw)) {
    return new Pool({ connectionString: raw, ssl: { rejectUnauthorized: false } });
  }

  // AWS Secrets Manager JSON
  const s = JSON.parse(raw);
  const cfg = {
    user:     s.username ?? s.user,
    password: s.password,
    host:     s.host ?? s.hostname,
    port:     Number(s.port ?? 5432),
    // prefer instance id (nartex-db), then explicit names, then last resort
    database: s.dbInstanceIdentifier ?? s.dbname ?? s.database ?? s.db ?? "postgres",
    ssl: { rejectUnauthorized: false },
  };
  if (!cfg.user || !cfg.password || !cfg.host) {
    throw new Error("RDS_CREDENTIALS JSON missing username/password/host.");
  }
  return new Pool(cfg);
}

export const pg = global.pgPool ?? buildPool();
if (!global.pgPool) global.pgPool = pg;
