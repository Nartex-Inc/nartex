// lib/db.ts
import 'server-only';
import { Pool } from "pg";
import fs from "fs";

declare global { var pgPool: Pool | undefined }

function readIfExists(p?: string) {
  if (!p) return undefined;
  try { return fs.readFileSync(p, "utf8"); } catch { return undefined; }
}

function buildPool(): Pool {
  const raw = process.env.RDS_CREDENTIALS || process.env.DATABASE_URL;
  if (!raw) throw new Error("Missing RDS_CREDENTIALS (or DATABASE_URL).");

  // Prefer our bundled CA(s)
  const candidatePaths = [
    process.env.PGSSLROOTCERT_PATH, // if you set it in task def, we'll use it
    "/etc/ssl/certs/rds-combined-ca-bundle.pem",
    "/etc/ssl/certs/rds-global-bundle.pem",
  ];
  const ca = candidatePaths.map(readIfExists).find(Boolean);
  const sslWithCA = ca ? { ca, rejectUnauthorized: true } : undefined;

  // Connection URL?
  if (/^postgres(ql)?:\/\//i.test(raw)) {
    return new Pool({
      connectionString: raw,
      ssl: sslWithCA ?? { rejectUnauthorized: false }, // fallback keeps old behavior
    });
  }

  // Secrets Manager JSON?
  const s = JSON.parse(raw);
  const cfg = {
    user:     s.username ?? s.user,
    password: s.password,
    host:     s.host ?? s.hostname,
    port:     Number(s.port ?? 5432),
    database: s.dbInstanceIdentifier ?? s.dbname ?? s.database ?? s.db ?? "postgres",
    ssl:      sslWithCA ?? { rejectUnauthorized: false },
  };
  if (!cfg.user || !cfg.password || !cfg.host) {
    throw new Error("RDS_CREDENTIALS JSON missing username/password/host.");
  }
  return new Pool(cfg);
}

export const pg = global.pgPool ?? buildPool();
if (!global.pgPool) global.pgPool = pg;
