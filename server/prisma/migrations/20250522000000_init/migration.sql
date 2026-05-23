-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'investigator', 'analyst', 'legal', 'journalist');
CREATE TYPE "CaseStatus" AS ENUM ('draft', 'submitted', 'pending', 'partial_response', 'full_response', 'rejected', 'first_appeal_filed', 'first_appeal_pending', 'second_appeal_filed', 'sic_pending', 'sic_order_received', 'court_pending', 'closed_success', 'closed_failure', 'archived');
CREATE TYPE "CasePriority" AS ENUM ('critical', 'high', 'medium', 'low');
CREATE TYPE "EntityType" AS ENUM ('person', 'govt_org', 'company', 'dept', 'contractor');
CREATE TYPE "DocumentType" AS ENUM ('application', 'response', 'first_appeal', 'second_appeal', 'sic_order', 'court_order', 'audit_report', 'news', 'evidence', 'tip');
CREATE TYPE "FactType" AS ENUM ('financial_amount', 'date', 'official_statement', 'entity_mention', 'legal_section', 'process_event', 'contractor_name', 'project_detail');
CREATE TYPE "FactConfidence" AS ENUM ('confirmed', 'uncertain', 'inferred');
CREATE TYPE "ContradictionType" AS ENUM ('numerical', 'temporal', 'statement', 'legal', 'financial');
CREATE TYPE "ContradictionSeverity" AS ENUM ('minor', 'significant', 'direct', 'fraud_indicator');
CREATE TYPE "ReviewStatus" AS ENUM ('unreviewed', 'confirmed', 'dismissed', 'published');
CREATE TYPE "AlertType" AS ENUM ('deadline_warning', 'deadline_overdue', 'contradiction', 'financial_discrepancy', 'missing_document', 'timeline_anomaly', 'high_corruption_score', 'invalid_exemption', 'penalty_accrual', 'entity_risk');
CREATE TYPE "AlertSeverity" AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE "AlertStatus" AS ENUM ('unreviewed', 'acknowledged', 'actioned', 'dismissed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'investigator',
    "totp_secret" TEXT,
    "totp_enabled" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT NOT NULL DEFAULT 'en',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "rti_cases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "rti_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "pio_officer" TEXT,
    "status" "CaseStatus" NOT NULL DEFAULT 'draft',
    "priority" "CasePriority" NOT NULL DEFAULT 'medium',
    "filed_date" DATE NOT NULL,
    "due_date" DATE NOT NULL,
    "response_date" DATE,
    "tags" TEXT[],
    "corruption_score" INTEGER NOT NULL DEFAULT 0,
    "is_public" BOOLEAN NOT NULL DEFAULT false,
    "is_sensitive" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rti_cases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "rti_cases_rti_id_key" ON "rti_cases"("rti_id");
CREATE INDEX "rti_cases_status_priority_due_date_idx" ON "rti_cases"("status", "priority", "due_date");

CREATE TABLE "entities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "name_ml" TEXT,
    "type" "EntityType" NOT NULL,
    "risk_score" INTEGER NOT NULL DEFAULT 0,
    "designation" TEXT,
    "parent_org" UUID,
    "external_ids" JSONB NOT NULL DEFAULT '{}',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "connection_count" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "entities_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "entities_name_idx" ON "entities"("name");

CREATE TABLE "documents" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "doc_type" "DocumentType" NOT NULL,
    "s3_key" TEXT,
    "sha256_hash" CHAR(64),
    "file_size" BIGINT,
    "mime_type" TEXT,
    "uploaded_by" UUID,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "text_content" TEXT,
    "not_answered" TEXT,
    "language" TEXT NOT NULL DEFAULT 'en',
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "documents_s3_key_key" ON "documents"("s3_key");
CREATE INDEX "documents_case_id_idx" ON "documents"("case_id");

CREATE TABLE "facts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "case_id" UUID NOT NULL,
    "fact_type" "FactType" NOT NULL,
    "content" TEXT NOT NULL,
    "amount" DECIMAL(18,2),
    "amount_currency" TEXT NOT NULL DEFAULT 'INR',
    "amount_category" TEXT,
    "fact_date" DATE,
    "entity_ref" UUID,
    "legal_section" TEXT,
    "confidence" "FactConfidence" NOT NULL DEFAULT 'confirmed',
    "entered_by" UUID,
    "entered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "facts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "facts_case_id_fact_type_idx" ON "facts"("case_id", "fact_type");

CREATE TABLE "contradictions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "fact_id_1" UUID NOT NULL,
    "fact_id_2" UUID NOT NULL,
    "case_id_1" UUID NOT NULL,
    "case_id_2" UUID NOT NULL,
    "contradiction_type" "ContradictionType" NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "ContradictionSeverity" NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 80,
    "status" "ReviewStatus" NOT NULL DEFAULT 'unreviewed',
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "ai_narrative" TEXT,
    CONSTRAINT "contradictions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "alerts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "alert_type" "AlertType" NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rule_id" TEXT,
    "formula" TEXT,
    "source_data" JSONB NOT NULL DEFAULT '{}',
    "status" "AlertStatus" NOT NULL DEFAULT 'unreviewed',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "audit_log" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "event_type" TEXT NOT NULL,
    "user_id" UUID,
    "case_id" UUID,
    "description" TEXT NOT NULL,
    "input_data" JSONB NOT NULL DEFAULT '{}',
    "result" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "case_entities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "relevance_score" INTEGER NOT NULL DEFAULT 50,
    CONSTRAINT "case_entities_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "case_entities_case_id_entity_id_role_key" ON "case_entities"("case_id", "entity_id", "role");

CREATE TABLE "entity_relationships" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_entity_id" UUID NOT NULL,
    "to_entity_id" UUID NOT NULL,
    "relationship_type" TEXT NOT NULL,
    "case_id" UUID,
    "notes" TEXT,
    CONSTRAINT "entity_relationships_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "case_links" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "from_case_id" UUID NOT NULL,
    "to_case_id" UUID NOT NULL,
    "link_type" TEXT NOT NULL,
    "strength" INTEGER NOT NULL DEFAULT 50,
    "notes" TEXT,
    CONSTRAINT "case_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "case_links_from_case_id_to_case_id_link_type_key" ON "case_links"("from_case_id", "to_case_id", "link_type");

CREATE TABLE "document_entities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "mention_context" TEXT,
    "page_ref" TEXT,
    CONSTRAINT "document_entities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

CREATE TABLE "case_tags" (
    "case_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    CONSTRAINT "case_tags_pkey" PRIMARY KEY ("case_id","tag_id")
);

CREATE TABLE "case_access" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "case_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'collaborator',
    CONSTRAINT "case_access_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "case_access_case_id_user_id_key" ON "case_access"("case_id", "user_id");

CREATE TABLE "lookup_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "source" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "query" JSONB NOT NULL DEFAULT '{}',
    "data_retrieved" JSONB,
    "decision" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lookup_logs_pkey" PRIMARY KEY ("id")
);

-- AddForeignKeys
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "rti_cases" ADD CONSTRAINT "rti_cases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "entities" ADD CONSTRAINT "entities_parent_org_fkey" FOREIGN KEY ("parent_org") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "documents" ADD CONSTRAINT "documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "rti_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "facts" ADD CONSTRAINT "facts_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "facts" ADD CONSTRAINT "facts_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "rti_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "facts" ADD CONSTRAINT "facts_entity_ref_fkey" FOREIGN KEY ("entity_ref") REFERENCES "entities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contradictions" ADD CONSTRAINT "contradictions_case_id_1_fkey" FOREIGN KEY ("case_id_1") REFERENCES "rti_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contradictions" ADD CONSTRAINT "contradictions_case_id_2_fkey" FOREIGN KEY ("case_id_2") REFERENCES "rti_cases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "rti_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "case_entities" ADD CONSTRAINT "case_entities_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "rti_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_entities" ADD CONSTRAINT "case_entities_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_from_entity_id_fkey" FOREIGN KEY ("from_entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "entity_relationships" ADD CONSTRAINT "entity_relationships_to_entity_id_fkey" FOREIGN KEY ("to_entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_links" ADD CONSTRAINT "case_links_from_case_id_fkey" FOREIGN KEY ("from_case_id") REFERENCES "rti_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_links" ADD CONSTRAINT "case_links_to_case_id_fkey" FOREIGN KEY ("to_case_id") REFERENCES "rti_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_entities" ADD CONSTRAINT "document_entities_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "document_entities" ADD CONSTRAINT "document_entities_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "entities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_tags" ADD CONSTRAINT "case_tags_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "rti_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_tags" ADD CONSTRAINT "case_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_access" ADD CONSTRAINT "case_access_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "rti_cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
