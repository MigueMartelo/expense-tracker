-- CreateIndex (before dropping the unique one, so user_id lookups stay indexed)
CREATE INDEX "budgets_user_id_idx" ON "budgets"("user_id");

-- DropIndex
DROP INDEX "budgets_user_id_key";
