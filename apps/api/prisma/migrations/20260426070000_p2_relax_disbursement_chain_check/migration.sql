-- Purpose: Relax the disbursement → village allocation FK constraint to permit
-- legacy single-stage flows whose disbursements legitimately have null FKs.
-- Why important: The original CHECK in 20260426050000_p2_geo_money_foundations
-- forbade non-PENDING rows without a village FK, which broke backward compat
-- for programs that have not been migrated to the Ward → Village → Student
-- distribution flow. The replacement enforces *chain integrity*: either both
-- ward + village FKs are set (new flow) or both are null (legacy flow), but
-- never half-linked. Status of PENDING is always accepted regardless.
-- Used by: DisbursementService (initiateDisbursement / updateTransactionStatus)
--          and any reporting / fixture code path that creates SUCCESS rows.

ALTER TABLE "disbursement_records"
  DROP CONSTRAINT IF EXISTS "disbursement_must_have_village_alloc";

ALTER TABLE "disbursement_records"
  ADD CONSTRAINT "disbursement_chain_integrity" CHECK (
    "status" = 'PENDING'
    OR (
      "village_budget_allocation_id" IS NOT NULL
      AND "ward_budget_allocation_id"    IS NOT NULL
    )
    OR (
      "village_budget_allocation_id" IS NULL
      AND "ward_budget_allocation_id"    IS NULL
    )
  );
