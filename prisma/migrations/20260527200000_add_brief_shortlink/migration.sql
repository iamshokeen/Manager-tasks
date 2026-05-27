-- Short URL slugs that resolve to a PDF brief (used in WhatsApp messages
-- to avoid wa.me truncating long JWT URLs).
CREATE TABLE "BriefShortlink" (
  "slug"      TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "dateStr"   TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BriefShortlink_pkey" PRIMARY KEY ("slug")
);

CREATE INDEX "BriefShortlink_userId_idx"    ON "BriefShortlink"("userId");
CREATE INDEX "BriefShortlink_expiresAt_idx" ON "BriefShortlink"("expiresAt");
