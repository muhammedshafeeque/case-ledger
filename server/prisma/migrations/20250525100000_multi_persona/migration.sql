-- Enums
CREATE TYPE "MediaKind" AS ENUM ('document', 'image', 'audio', 'video');
CREATE TYPE "DiaryEntryType" AS ENUM ('patrol', 'interview', 'seizure', 'court', 'other');
CREATE TYPE "StoryBoardKind" AS ENUM ('hypothesis', 'lead', 'dead_end', 'publishable');
CREATE TYPE "AppealLevel" AS ENUM ('none', 'first', 'second', 'sic');
CREATE TYPE "ExportProfileType" AS ENUM ('full', 'redacted', 'publishable');

ALTER TYPE "InvestigationType" ADD VALUE 'criminal';
ALTER TYPE "InvestigationType" ADD VALUE 'missing_persons';
ALTER TYPE "InvestigationType" ADD VALUE 'financial_crime';
ALTER TYPE "InvestigationType" ADD VALUE 'cyber';
ALTER TYPE "InvestigationType" ADD VALUE 'internal_affairs';

ALTER TYPE "CustodyEventType" ADD VALUE 'seized';
ALTER TYPE "CustodyEventType" ADD VALUE 'transferred';
ALTER TYPE "CustodyEventType" ADD VALUE 'sealed';
ALTER TYPE "CustodyEventType" ADD VALUE 'released';

ALTER TYPE "ForensicJobType" ADD VALUE 'extract_metadata';
ALTER TYPE "ForensicJobType" ADD VALUE 'transcribe_audio';
ALTER TYPE "ExtractionSource" ADD VALUE 'tesseract';

-- Documents
ALTER TABLE "documents" ADD COLUMN "media_kind" "MediaKind" NOT NULL DEFAULT 'document';
ALTER TABLE "documents" ADD COLUMN "exhibit_number" TEXT;
ALTER TABLE "documents" ADD COLUMN "bates_start" TEXT;
ALTER TABLE "documents" ADD COLUMN "bates_end" TEXT;
ALTER TABLE "documents" ADD COLUMN "metadata_extracted" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "documents" ADD COLUMN "legal_hold" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "documents" ADD COLUMN "retention_until" DATE;

-- Entities
ALTER TABLE "entities" ADD COLUMN "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "entities" ADD COLUMN "date_of_birth" DATE;
ALTER TABLE "entities" ADD COLUMN "phones" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "entities" ADD COLUMN "addresses" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "entities" ADD COLUMN "id_numbers" JSONB NOT NULL DEFAULT '{}';

-- Cases
ALTER TABLE "rti_cases" ADD COLUMN "crime_number" TEXT;
ALTER TABLE "rti_cases" ADD COLUMN "fir_number" TEXT;
ALTER TABLE "rti_cases" ADD COLUMN "station" TEXT;
ALTER TABLE "rti_cases" ADD COLUMN "court_case_number" TEXT;
ALTER TABLE "rti_cases" ADD COLUMN "jurisdiction" TEXT;
ALTER TABLE "rti_cases" ADD COLUMN "appeal_level" "AppealLevel" NOT NULL DEFAULT 'none';
ALTER TABLE "rti_cases" ADD COLUMN "appeal_filed_at" DATE;
ALTER TABLE "rti_cases" ADD COLUMN "partial_response" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "rti_cases" ADD COLUMN "embargo_until" TIMESTAMP(3);
ALTER TABLE "rti_cases" ADD COLUMN "legal_review_status" TEXT;
ALTER TABLE "rti_cases" ADD COLUMN "publication_checklist" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "rti_cases" ADD COLUMN "network_snapshot" JSONB;

-- Case access
ALTER TABLE "case_access" ADD COLUMN "permissions" TEXT[] NOT NULL DEFAULT ARRAY['view','edit','add_evidence','export_full']::TEXT[];

-- Users
ALTER TABLE "users" ADD COLUMN "workspace_mode" TEXT NOT NULL DEFAULT 'accountability';
ALTER TABLE "users" ADD COLUMN "preferences" JSONB NOT NULL DEFAULT '{}';

-- New tables
CREATE TABLE "case_diary_entries" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "entry_at" TIMESTAMP(3) NOT NULL,
    "entry_type" "DiaryEntryType" NOT NULL,
    "summary" TEXT NOT NULL,
    "location" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "officer_ids" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "is_privileged" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "case_diary_entries_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "interview_records" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "person_entity_id" UUID NOT NULL,
    "conducted_at" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "officers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "summary" TEXT NOT NULL,
    "document_id" UUID,
    "is_sealed" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "interview_records_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "protected_sources" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "codename" TEXT NOT NULL,
    "real_identity_enc" TEXT NOT NULL,
    "contact_method" TEXT,
    "notes_enc" TEXT,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "protected_sources_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "story_board_items" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "kind" "StoryBoardKind" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "story_board_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "evidence_items" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "item_number" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "seized_at" TIMESTAMP(3) NOT NULL,
    "seized_by" UUID,
    "location" TEXT,
    "document_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "evidence_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "evidence_items_document_id_key" ON "evidence_items"("document_id");
CREATE INDEX "case_diary_entries_case_id_entry_at_idx" ON "case_diary_entries"("case_id", "entry_at");
CREATE INDEX "interview_records_case_id_idx" ON "interview_records"("case_id");
CREATE INDEX "protected_sources_case_id_idx" ON "protected_sources"("case_id");
CREATE INDEX "story_board_items_case_id_sort_order_idx" ON "story_board_items"("case_id", "sort_order");
CREATE INDEX "evidence_items_case_id_idx" ON "evidence_items"("case_id");
CREATE INDEX "documents_exhibit_number_idx" ON "documents"("exhibit_number");

ALTER TABLE "case_diary_entries" ADD CONSTRAINT "case_diary_entries_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "rti_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_diary_entries" ADD CONSTRAINT "case_diary_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "interview_records" ADD CONSTRAINT "interview_records_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "rti_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "interview_records" ADD CONSTRAINT "interview_records_person_entity_id_fkey" FOREIGN KEY ("person_entity_id") REFERENCES "entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "interview_records" ADD CONSTRAINT "interview_records_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "protected_sources" ADD CONSTRAINT "protected_sources_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "rti_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "protected_sources" ADD CONSTRAINT "protected_sources_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "story_board_items" ADD CONSTRAINT "story_board_items_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "rti_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "rti_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "evidence_items" ADD CONSTRAINT "evidence_items_seized_by_fkey" FOREIGN KEY ("seized_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
