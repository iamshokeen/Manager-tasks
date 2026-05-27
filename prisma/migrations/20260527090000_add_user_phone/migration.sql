-- AlterTable: store an E.164 phone number on User for WhatsApp dispatch.
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
