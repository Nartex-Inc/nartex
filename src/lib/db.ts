// lib/db.ts
import { Pool } from "pg";

declare global { var pgPool: Pool | undefined }

function buildPool(): Pool {
  const raw = process.env.RDS_CREDENTIALS || process.env.DATABASE_URL;
  if (!raw) throw new Error("Missing RDS_CREDENTIALS (or DATABASE_URL).");

  // 1) Full connection string
  if (/^postgres(ql)?:\/\//i.test(raw)) {
    return new Pool({
      connectionString: raw,
      ssl: { rejectUnauthorized: false },
    });
  }

  // 2) AWS Secrets Manager JSON
  const s = JSON.parse(raw); // { username, password, host, port, dbInstanceIdentifier, ... }
  const cfg = {
    user:     s.username ?? s.user,
    password: s.password,
    host:     s.host ?? s.hostname,
    port:     Number(s.port ?? 5432),

    // Prefer the RDS instance identifier (nartex-db in your case),
    // then explicit names, then last-resort 'postgres'.
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
