-- AlterTable
ALTER TABLE "counties" ADD COLUMN "deleted_at" TIMESTAMPTZ(6);

-- CreateIndex
CREATE INDEX "counties_deleted_at_idx" ON "counties"("deleted_at");
