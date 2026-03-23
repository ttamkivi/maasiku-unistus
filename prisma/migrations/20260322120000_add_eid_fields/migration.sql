ALTER TABLE "User" ADD COLUMN "personalCode" TEXT;
ALTER TABLE "User" ADD COLUMN "phoneNumber" TEXT;
CREATE UNIQUE INDEX "User_personalCode_key" ON "User"("personalCode");
