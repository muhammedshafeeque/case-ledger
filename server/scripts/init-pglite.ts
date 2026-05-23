import { PGlite } from "@electric-sql/pglite";
import { join } from "path";
import { readFileSync } from "fs";

const dataDir = join(process.cwd(), ".pglite");
const pglite = new PGlite(dataDir);

const migrationSql = readFileSync(
  join(process.cwd(), "prisma/migrations/20250522000000_init/migration.sql"),
  "utf-8"
);

const blocks = [
  ...(migrationSql.match(/CREATE TYPE[\s\S]*?;/g) ?? []),
  ...(migrationSql.match(/CREATE TABLE[\s\S]*?;/g) ?? []),
  ...(migrationSql.match(/CREATE UNIQUE INDEX[\s\S]*?;/g) ?? []),
  ...(migrationSql.match(/CREATE INDEX[\s\S]*?;/g) ?? []),
  ...(migrationSql.match(/ALTER TABLE[\s\S]*?;/g) ?? []),
].filter((s) => !s.includes("CREATE EXTENSION"));

console.log(`Applying ${blocks.length} blocks to PGlite...`);

for (const block of blocks) {
  try {
    await pglite.exec(block);
  } catch (err) {
    const msg = String(err);
    if (msg.includes("already exists")) continue;
    console.warn("Warn:", block.slice(0, 50).replace(/\s+/g, " "), "—", msg.slice(0, 100));
  }
}

await pglite.close();
console.log("PGlite schema ready.");
