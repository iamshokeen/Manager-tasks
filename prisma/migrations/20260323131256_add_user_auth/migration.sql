-- CreateEnum
CREATE TYPE "Role" AS ENUM ('MANAGER', 'JUNIOR');

-- AlterTable
ALTER TABLE "TaskActivity" ADD COLUMN     "authorName" TEXT;

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'JUNIOR',
    "teamMemberId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_teamMemberId_key" ON "User"("teamMemberId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_teamMemberId_fkey" FOREIGN KEY ("teamMemberId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;
