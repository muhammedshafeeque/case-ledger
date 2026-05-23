/**
 * Wipes all investigation data (cases, documents, facts, alerts, etc.).
 * Keeps user accounts.
 *
 * Usage: npm run db:clear
 * Optional: CLEAR_USERS=true npm run db:clear  (removes all users too)
 */
import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

async function getPrisma() {
  if (process.env.USE_PGLITE === "true") {
    const { initPglitePrisma } = await import("../src/lib/prisma-pglite.js");
    return initPglitePrisma();
  }
  return new PrismaClient();
}

const prisma = await getPrisma();

async function clearPostgres() {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      audit_log,
      lookup_logs,
      interview_records,
      protected_sources,
      story_board_items,
      evidence_items,
      case_diary_entries,
      document_annotations,
      forensic_jobs,
      chain_of_custody_events,
      document_extractions,
      tasks,
      case_notes,
      refresh_tokens,
      contradictions,
      alerts,
      facts,
      document_entities,
      documents,
      case_entities,
      case_links,
      case_tags,
      case_access,
      entity_relationships,
      entities,
      rti_cases,
      tags
    RESTART IDENTITY CASCADE;
  `);
}

async function clearPglite() {
  await prisma.interviewRecord.deleteMany();
  await prisma.protectedSource.deleteMany();
  await prisma.storyBoardItem.deleteMany();
  await prisma.evidenceItem.deleteMany();
  await prisma.caseDiaryEntry.deleteMany();
  await prisma.documentAnnotation.deleteMany();
  await prisma.forensicJob.deleteMany();
  await prisma.chainOfCustodyEvent.deleteMany();
  await prisma.documentExtraction.deleteMany();
  await prisma.task.deleteMany();
  await prisma.caseNote.deleteMany();
  await prisma.contradiction.deleteMany();
  await prisma.alert.deleteMany();
  await prisma.fact.deleteMany();
  await prisma.documentEntity.deleteMany();
  await prisma.document.deleteMany();
  await prisma.caseEntity.deleteMany();
  await prisma.caseLink.deleteMany();
  await prisma.caseTag.deleteMany();
  await prisma.caseAccess.deleteMany();
  await prisma.lookupLog.deleteMany();
  await prisma.entityRelationship.deleteMany();
  await prisma.entity.deleteMany();
  await prisma.rtiCase.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.refreshToken.deleteMany();
}

async function ensureDefaultUsers() {
  const adminEmail = "admin@rti-watch.local";
  let admin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: adminEmail,
        name: "System Admin",
        role: "admin",
        passwordHash: await bcrypt.hash("Admin@RTI2026", 12),
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "investigator@rti-watch.local" },
    create: {
      email: "investigator@rti-watch.local",
      name: "Lead Investigator",
      role: "investigator",
      passwordHash: await bcrypt.hash("Investigate@2026", 12),
    },
    update: {},
  });
}

async function main() {
  const clearUsers = process.env.CLEAR_USERS === "true";

  console.log("Clearing application data (cases, documents, entities, logs)…");

  if (process.env.USE_PGLITE === "true") {
    await clearPglite();
  } else {
    await clearPostgres();
  }

  if (clearUsers) {
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    console.log("Cleared users.");
  } else {
    await ensureDefaultUsers();
  }

  console.log("Done. Database is empty except:");
  console.log("  - Users (admin + investigator) unless CLEAR_USERS=true");
  console.log("  - Reference SQLite (law rules / i18n) unchanged");
  console.log("");
  console.log("Log in and create investigations from the UI.");
}

main()
  .then(() => prisma.$disconnect())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });
