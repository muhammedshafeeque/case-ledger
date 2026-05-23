/**
 * Run RTI Watch without Docker:
 * - Embedded Postgres (PGlite) in server/.pglite
 * - SQLite reference DB (seeded)
 * - Redis optional (worker skipped if unavailable)
 */
import { spawn } from "child_process";
import { execSync } from "child_process";
import { existsSync, mkdirSync } from "fs";
import { join } from "path";

process.env.USE_PGLITE = "true";
process.env.NODE_ENV = "development";

const serverDir = join(import.meta.dirname, "..");
process.chdir(serverDir);

mkdirSync(join(serverDir, "reference"), { recursive: true });

console.log("Setting up reference SQLite...");
execSync("npx prisma db push --schema=prisma/reference/schema.prisma --skip-generate", {
  stdio: "inherit",
  env: process.env,
});

console.log("Initializing embedded database (PGlite)...");
execSync("npx tsx scripts/init-pglite.ts", { stdio: "inherit", env: process.env });

console.log("Seeding reference + app data...");
execSync("npx tsx prisma/seed.ts", { stdio: "inherit", env: process.env });

console.log("\nStarting API on http://localhost:3001");
console.log("Start client separately: cd ../client && npm run dev\n");

const api = spawn("npx", ["tsx", "src/index.ts"], {
  stdio: "inherit",
  env: process.env,
  cwd: serverDir,
});

api.on("exit", (code) => process.exit(code ?? 0));

process.on("SIGINT", () => {
  api.kill("SIGINT");
  process.exit(0);
});
