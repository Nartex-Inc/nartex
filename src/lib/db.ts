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

  // Shared safeguards for db.t4g.micro (2 vCPU, 1 GB RAM)
  const poolDefaults = {
    max: 5,                       // keep pool small — micro can't handle many connections
    connectionTimeoutMillis: 5000, // fail fast if pool exhausted (was: wait forever)
    idleTimeoutMillis: 30000,
    statement_timeout: 30000,      // kill queries after 30 s (was: unlimited)
  };

  // Connection URL?
  if (/^postgres(ql)?:\/\//i.test(raw)) {
    return new Pool({
      connectionString: raw,
      ssl: sslWithCA ?? { rejectUnauthorized: false },
      ...poolDefaults,
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
    ...poolDefaults,
  };
  if (!cfg.user || !cfg.password || !cfg.host) {
    throw new Error("RDS_CREDENTIALS JSON missing username/password/host.");
  }
  return new Pool(cfg);
}

export const pg = global.pgPool ?? buildPool();
if (!global.pgPool) {
  global.pgPool = pg;
  // Session-level tuning for db.t4g.micro (2 vCPU, 1 GB RAM).
  pg.on("connect", (client) => {
    client.query("SET max_parallel_workers_per_gather = 0").catch(() => {});
    // 8MB work_mem prevents hash aggregate spills to disk.
    // Worst case: 5 connections × 8MB = 40MB — safe on 1GB instance.
    client.query("SET work_mem = '8MB'").catch(() => {});
  });
}
