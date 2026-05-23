-- CreateEnum
CREATE TYPE "DocumentProcessingStatus" AS ENUM ('pending', 'processing', 'done', 'failed', 'skipped');
CREATE TYPE "ExtractionStatus" AS ENUM ('pending', 'processing', 'done', 'failed');
CREATE TYPE "ExtractionSource" AS ENUM ('pdf_text', 'paste', 'cloud_ocr', 'manual');
CREATE TYPE "CustodyEventType" AS ENUM ('received', 'hashed', 'stored', 'viewed', 'exported', 'verified', 'extracted');
CREATE TYPE "ForensicJobStatus" AS ENUM ('pending', 'active', 'completed', 'failed');
CREATE TYPE "ForensicJobType" AS ENUM ('extract_document');
CREATE TYPE "AnnotationLabel" AS ENUM ('redaction', 'key_quote', 'not_answered', 'comment');

-- AlterTable
ALTER TABLE "documents" ADD COLUMN "original_filename" TEXT,
ADD COLUMN "processing_status" "DocumentProcessingStatus" NOT NULL DEFAULT 'pending',
ADD COLUMN "extracted_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "document_extractions" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "status" "ExtractionStatus" NOT NULL DEFAULT 'pending',
    "source" "ExtractionSource",
    "extracted_text" TEXT,
    "page_count" INTEGER,
    "language" TEXT,
    "error" TEXT,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_extractions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "chain_of_custody_events" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "event_type" "CustodyEventType" NOT NULL,
    "actor_id" UUID,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "chain_of_custody_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "forensic_jobs" (
    "id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "document_id" UUID,
    "job_type" "ForensicJobType" NOT NULL,
    "status" "ForensicJobStatus" NOT NULL DEFAULT 'pending',
    "bullmq_job_id" TEXT,
    "result" JSONB NOT NULL DEFAULT '{}',
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    CONSTRAINT "forensic_jobs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "document_annotations" (
    "id" UUID NOT NULL,
    "document_id" UUID NOT NULL,
    "page" INTEGER,
    "start_offset" INTEGER,
    "end_offset" INTEGER,
    "quote" TEXT NOT NULL,
    "label" "AnnotationLabel" NOT NULL,
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_processing_status_idx" ON "documents"("processing_status");
CREATE INDEX "document_extractions_document_id_created_at_idx" ON "document_extractions"("document_id", "created_at");
CREATE INDEX "chain_of_custody_events_document_id_occurred_at_idx" ON "chain_of_custody_events"("document_id", "occurred_at");
CREATE INDEX "chain_of_custody_events_case_id_occurred_at_idx" ON "chain_of_custody_events"("case_id", "occurred_at");
CREATE INDEX "forensic_jobs_case_id_status_idx" ON "forensic_jobs"("case_id", "status");
CREATE INDEX "forensic_jobs_document_id_idx" ON "forensic_jobs"("document_id");
CREATE INDEX "document_annotations_document_id_idx" ON "document_annotations"("document_id");

-- AddForeignKey
ALTER TABLE "document_extractions" ADD CONSTRAINT "document_extractions_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chain_of_custody_events" ADD CONSTRAINT "chain_of_custody_events_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chain_of_custody_events" ADD CONSTRAINT "chain_of_custody_events_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "rti_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "chain_of_custody_events" ADD CONSTRAINT "chain_of_custody_events_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "forensic_jobs" ADD CONSTRAINT "forensic_jobs_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "rti_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "forensic_jobs" ADD CONSTRAINT "forensic_jobs_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_annotations" ADD CONSTRAINT "document_annotations_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_annotations" ADD CONSTRAINT "document_annotations_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
