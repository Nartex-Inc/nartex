// src/lib/db.ts
import "server-only";
import { Pool, PoolConfig } from "pg";
import fs from "fs";

declare global {
  // so the pool is reused across hot reloads in dev / singletons in prod
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

/**
 * Build an SSL config for node-postgres.
 * - If PGSSLROOTCERT_PATH or PGSSLROOTCERT is set and readable, use it and verify.
 * - Otherwise, fall back to { rejectUnauthorized: false } to keep working with
 *   RDS when a CA isn't provided (previous behaviour).
 */
function buildSslConfig(): PoolConfig["ssl"] {
  const caPath =
    process.env.PGSSLROOTCERT_PATH || process.env.PGSSLROOTCERT || "";

  if (caPath) {
    try {
      const ca = fs.readFileSync(caPath, "utf8");
      return { ca, rejectUnauthorized: true };
    } catch (err) {
      console.warn(
        `[db] PGSSLROOTCERT path set but unreadable (${caPath}); falling back to insecure TLS. Error:`,
        (err as Error)?.message || err
      );
      return { rejectUnauthorized: false };
    }
  }

  // No CA provided -> keep old behaviour so connections still succeed.
  return { rejectUnauthorized: false };
}

function buildPool(): Pool {
  const raw = process.env.RDS_CREDENTIALS || process.env.DATABASE_URL;
  if (!raw) throw new Error("Missing RDS_CREDENTIALS (or DATABASE_URL).");

  const ssl = buildSslConfig();

  // If given a full postgres connection string
  if (/^postgres(ql)?:\/\//i.test(raw)) {
    return new Pool({ connectionString: raw, ssl });
  }

  // Otherwise expect AWS Secrets Manager JSON structure
  const s = JSON.parse(raw);
  const cfg: PoolConfig = {
    user: s.username ?? s.user,
    password: s.password,
    host: s.host ?? s.hostname,
    port: Number(s.port ?? 5432),
    // Prefer actual DB name if present; fall back defensively.
    database: s.dbname ?? s.database ?? s.db ?? s.dbInstanceIdentifier ?? "postgres",
    ssl,
  };

  if (!cfg.user || !cfg.password || !cfg.host) {
    throw new Error("RDS_CREDENTIALS JSON missing username/password/host.");
  }

  return new Pool(cfg);
}

export const pg = global.pgPool ?? buildPool();
if (!global.pgPool) global.pgPool = pg;
