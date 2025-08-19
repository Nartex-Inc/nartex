// lib/db.ts
import { Pool } from "pg";

declare global {
  // avoid creating multiple pools in dev/HMR
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

function buildPool(): Pool {
  const raw = process.env.RDS_CREDENTIALS || process.env.DATABASE_URL;

  // Allow using either a full connection string or an AWS SM JSON blob
  if (raw && raw.startsWith("postgres")) {
    return new Pool({
      connectionString: raw,
      ssl: { rejectUnauthorized: false }, // RDS/Aurora typically needs SSL
    });
  }

  if (!raw) throw new Error("Missing RDS_CREDENTIALS (or DATABASE_URL).");

  const s = JSON.parse(raw); // {username,password,host,port,dbname,...}
  return new Pool({
    user: s.username || s.user,
    password: s.password,
    host: s.host,
    port: Number(s.port ?? 5432),
    database: s.dbname || s.database,
    ssl: { rejectUnauthorized: false },
  });
}

export const pg = global.pgPool ?? buildPool();
if (!global.pgPool) global.pgPool = pg;
