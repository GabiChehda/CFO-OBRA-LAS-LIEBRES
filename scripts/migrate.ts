import { config } from "dotenv";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { Client } from "pg";

config({ path: path.join(process.cwd(), ".env.local") });

async function main() {
  const connectionString = process.env.SUPABASE_DB_URL;
  if (!connectionString) {
    throw new Error(
      "Falta SUPABASE_DB_URL en .env.local. Es el 'Connection string' (URI) de Settings > Database en tu proyecto Supabase."
    );
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  // Proyecto compartido con otra app: todo Obra Las Liebres vive en su propio
  // schema, incluida la tabla de tracking de migraciones (nunca tocamos `public`).
  await client.query("create schema if not exists obra_liebres");
  await client.query("set search_path to obra_liebres");

  await client.query(
    "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())"
  );
  const { rows } = await client.query<{ name: string }>("select name from _migrations");
  const applied = new Set(rows.map((r) => r.name));

  const dir = path.join(process.cwd(), "supabase", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`✓ ${file} (ya aplicada)`);
      continue;
    }
    console.log(`→ aplicando ${file}...`);
    const sql = readFileSync(path.join(dir, file), "utf-8");
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into _migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log(`✓ ${file}`);
    } catch (err) {
      await client.query("rollback");
      throw err;
    }
  }

  await client.end();
  console.log("Migraciones al día.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
