-- AlterTable
ALTER TABLE "Observation" ADD COLUMN     "abnormalFlags" TEXT,
ADD COLUMN     "referenceRangeHigh" TEXT,
ADD COLUMN     "referenceRangeLow" TEXT,
ADD COLUMN     "resultStatus" TEXT,
ADD COLUMN     "units" TEXT,
ADD COLUMN     "value" TEXT,
ADD COLUMN     "valueType" TEXT;
