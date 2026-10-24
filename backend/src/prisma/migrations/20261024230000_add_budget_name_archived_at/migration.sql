-- AlterTable
ALTER TABLE "budgets" ADD COLUMN     "archived_at" TIMESTAMP(3),
ADD COLUMN     "name" TEXT NOT NULL DEFAULT 'Presupuesto mensual';
