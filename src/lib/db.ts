// lib/db.ts
import { Pool } from "pg";

declare global { var pgPool: Pool | undefined; }

function buildPool(): Pool {
  const raw = process.env.RDS_CREDENTIALS || process.env.DATABASE_URL;
  if (!raw) throw new Error("Missing RDS_CREDENTIALS (or DATABASE_URL).");

  // 1) Connection string path
  if (raw.startsWith("postgres")) {
    return new Pool({
      connectionString: raw,
      ssl: { rejectUnauthorized: false },
    });
  }

  // 2) JSON secret path
  const s = JSON.parse(raw); // AWS SM JSON
  const user = s.username ?? s.user;
  const password = s.password;
  const host = s.host ?? s.hostname;
  const port = Number(s.port ?? 5432);
  const database =
    s.dbname ?? s.database ?? s.db ?? s.dbInstanceIdentifier ?? "postgres";

  if (!user || !password || !host) {
    throw new Error("RDS_CREDENTIALS JSON missing required keys (username/password/host).");
  }

  return new Pool({
    user,
    password,
    host,
    port,
    database,
    ssl: { rejectUnauthorized: false },
  });
}

export const pg = global.pgPool ?? buildPool();
if (!global.pgPool) global.pgPool = pg;
