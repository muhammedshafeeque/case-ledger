import "dotenv/config";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { PrismaClient as RefClient } from "../src/generated/reference-client/index.js";

async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

async function getPrisma() {
  if (process.env.USE_PGLITE === "true") {
    const { initPglitePrisma } = await import("../src/lib/prisma-pglite.js");
    return initPglitePrisma();
  }
  return new PrismaClient();
}

const prisma = await getPrisma();

async function seedReference() {
  const ref = new RefClient();
  await ref.rtiActSection.upsert({
    where: { sectionId: "S.8(1)(d)" },
    create: {
      sectionId: "S.8(1)(d)",
      sectionText: "Information which would cause a breach of privilege of Parliament...",
      commonName: "Parliament privilege exemption",
      exemptionValidityConditions: "Must show specific privilege, not blanket refusal",
    },
    update: {},
  });
  await ref.processTimeline.upsert({
    where: { id: 1 },
    create: { processType: "tender_floated", minDays: 21, maxDays: 90, legalBasis: "Kerala procurement norms" },
    update: {},
  }).catch(async () => {
    await ref.processTimeline.create({ data: { processType: "tender_floated", minDays: 21 } });
  });
  const mandatoryDocs = [
    { responseType: "procurement", docType: "evaluation_scores", isMandatory: true, legalBasis: "Procurement transparency" },
    { responseType: "procurement", docType: "tender_notice", isMandatory: true, legalBasis: null },
    { responseType: "procurement", docType: "bidder_list", isMandatory: true, legalBasis: null },
  ] as const;
  for (const doc of mandatoryDocs) {
    const exists = await ref.mandatoryDocument.findFirst({
      where: { responseType: doc.responseType, docType: doc.docType },
    });
    if (!exists) await ref.mandatoryDocument.create({ data: doc });
  }

  await ref.evasionPattern.upsert({
    where: { patternId: "vague_section_8" },
    create: {
      patternId: "vague_section_8",
      description: "Blanket S.8 citation without specifics",
      sectionCited: "S.8(1)(d)",
      validityAssessment: "likely_invalid",
      counterArguments: "PIO must show how exemption applies to each withheld part per SC precedents",
    },
    update: {},
  });

  const { UI_TRANSLATIONS } = await import("./seed-translations.js");
  for (const t of UI_TRANSLATIONS) {
    await ref.uiTranslation.upsert({
      where: { key: t.key },
      create: t,
      update: { english: t.english, malayalam: t.malayalam },
    });
  }
  await ref.$disconnect();
}

async function main() {
  await seedReference();

  const adminEmail = "admin@rti-watch.local";
  const existing = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existing) {
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "System Admin",
        role: "admin",
        passwordHash: await hashPassword("Admin@RTI2026"),
      },
    });
  }

  await prisma.user.upsert({
    where: { email: "investigator@rti-watch.local" },
    create: {
      email: "investigator@rti-watch.local",
      name: "Lead Investigator",
      role: "investigator",
      passwordHash: await hashPassword("Investigate@2026"),
    },
    update: {},
  });

  console.log("Seed complete (users + reference data only). Create investigations from the app.");
}

async function shutdown() {
  try {
    await prisma.$disconnect();
  } catch {
    // PGlite adapter may throw on disconnect — safe to ignore after successful seed
  }
}

main()
  .then(async () => {
    await shutdown();
    process.exit(0);
  })
  .catch(async (err) => {
    console.error(err);
    await shutdown();
    process.exit(1);
  });
