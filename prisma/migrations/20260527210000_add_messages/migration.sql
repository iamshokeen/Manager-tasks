-- In-app instant messaging.
CREATE TABLE "Message" (
  "id"          TEXT NOT NULL,
  "senderId"    TEXT NOT NULL,
  "recipientId" TEXT NOT NULL,
  "body"        TEXT NOT NULL,
  "readAt"      TIMESTAMP(3),
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_recipientId_fkey"
  FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "Message_sender_recipient_created_idx"
  ON "Message"("senderId", "recipientId", "createdAt");
CREATE INDEX "Message_recipient_readAt_idx"
  ON "Message"("recipientId", "readAt");
