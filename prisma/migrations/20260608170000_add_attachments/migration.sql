-- Attachment storage: a single polymorphic table for files uploaded to
-- Tasks, Projects, or Messages. Exactly one of taskId/projectId/messageId
-- is set per row. File payload lives in Vercel Blob; `url` holds the
-- public/signed URL.

CREATE TABLE "Attachment" (
  "id"         TEXT NOT NULL,
  "filename"   TEXT NOT NULL,
  "mimeType"   TEXT NOT NULL,
  "size"       INTEGER NOT NULL,
  "url"        TEXT NOT NULL,
  "uploaderId" TEXT,
  "taskId"     TEXT,
  "projectId"  TEXT,
  "messageId"  TEXT,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Attachment_taskId_idx"    ON "Attachment"("taskId");
CREATE INDEX "Attachment_projectId_idx" ON "Attachment"("projectId");
CREATE INDEX "Attachment_messageId_idx" ON "Attachment"("messageId");

ALTER TABLE "Attachment"
  ADD CONSTRAINT "Attachment_uploaderId_fkey"
  FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Attachment"
  ADD CONSTRAINT "Attachment_taskId_fkey"
  FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attachment"
  ADD CONSTRAINT "Attachment_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attachment"
  ADD CONSTRAINT "Attachment_messageId_fkey"
  FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
