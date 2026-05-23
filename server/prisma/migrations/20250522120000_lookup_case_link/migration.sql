-- AlterTable
ALTER TABLE "lookup_logs" ADD COLUMN "case_id" UUID;
ALTER TABLE "lookup_logs" ADD COLUMN "fetch_mode" TEXT;
ALTER TABLE "lookup_logs" ALTER COLUMN "decision" SET DEFAULT 'pending_review';

-- CreateIndex
CREATE INDEX "lookup_logs_case_id_idx" ON "lookup_logs"("case_id");

-- AddForeignKey
ALTER TABLE "lookup_logs" ADD CONSTRAINT "lookup_logs_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "rti_cases"("id") ON DELETE SET NULL ON UPDATE CASCADE;
