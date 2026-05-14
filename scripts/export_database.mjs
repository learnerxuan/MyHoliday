import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

const envPath = path.resolve(".env.local");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return;

  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const index = trimmed.indexOf("=");
    if (index === -1) continue;

    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] ||= value;
  }
}

function ident(name) {
  return `"${String(name).replaceAll('"', '""')}"`;
}

function literal(value) {
  if (value === null || value === undefined) return "NULL";
  if (Buffer.isBuffer(value)) return `decode('${value.toString("hex")}', 'hex')`;
  if (value instanceof Date) return `'${value.toISOString().replaceAll("'", "''")}'`;
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "NULL";
  if (typeof value === "object") return `'${JSON.stringify(value).replaceAll("'", "''")}'::jsonb`;
  return `'${String(value).replaceAll("'", "''")}'`;
}

loadEnv(envPath);

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env.local first.");
  process.exit(1);
}

const outDir = path.resolve("database-export");
fs.mkdirSync(outDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = path.join(outDir, `myholiday-database-${timestamp}.sql`);

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

const tableResult = await client.query(`
  SELECT table_schema, table_name
  FROM information_schema.tables
  WHERE table_type = 'BASE TABLE'
    AND table_schema IN ('public', 'auth', 'storage')
  ORDER BY
    CASE table_schema
      WHEN 'auth' THEN 1
      WHEN 'storage' THEN 2
      WHEN 'public' THEN 3
      ELSE 4
    END,
    table_name
`);

const tables = tableResult.rows;
const lines = [];

lines.push("-- MyHoliday database data export");
lines.push(`-- Created at ${new Date().toISOString()}`);
lines.push("-- Restore after applying supabase/migrations/20260420000000_full_schema.sql");
lines.push("-- WARNING: auth schema rows can contain sensitive account data.");
lines.push("");
lines.push("BEGIN;");
lines.push("SET session_replication_role = replica;");
lines.push("");

for (const table of [...tables].reverse()) {
  lines.push(`TRUNCATE TABLE ${ident(table.table_schema)}.${ident(table.table_name)} RESTART IDENTITY CASCADE;`);
}

lines.push("");

for (const table of tables) {
  const fullName = `${ident(table.table_schema)}.${ident(table.table_name)}`;
  const columnsResult = await client.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = $2
      ORDER BY ordinal_position
    `,
    [table.table_schema, table.table_name],
  );
  const columns = columnsResult.rows.map((row) => row.column_name);
  if (columns.length === 0) continue;

  const rowsResult = await client.query(`SELECT * FROM ${fullName}`);
  lines.push(`-- ${table.table_schema}.${table.table_name}: ${rowsResult.rowCount} rows`);

  for (const row of rowsResult.rows) {
    const colSql = columns.map(ident).join(", ");
    const valSql = columns.map((column) => literal(row[column])).join(", ");
    lines.push(`INSERT INTO ${fullName} (${colSql}) VALUES (${valSql});`);
  }

  lines.push("");
}

lines.push("SET session_replication_role = DEFAULT;");
lines.push("COMMIT;");
lines.push("");

fs.writeFileSync(outputPath, lines.join("\n"), "utf8");

await client.end();

console.log(outputPath);
