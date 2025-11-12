/*
  Warnings:

  - A unique constraint covering the columns `[orderId,setId]` on the table `Observation` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Observation_orderId_setId_key" ON "Observation"("orderId", "setId");
