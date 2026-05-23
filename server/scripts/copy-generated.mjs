#!/usr/bin/env node
/** Copy Prisma-generated clients into dist/ (tsc does not emit .js from src/generated). */
import { cpSync, existsSync } from "fs";

const src = "src/generated";
const dest = "dist/generated";

if (!existsSync(src)) {
  console.error("Missing src/generated — run: npm run db:generate");
  process.exit(1);
}

cpSync(src, dest, { recursive: true });
console.log(`Copied ${src} -> ${dest}`);
