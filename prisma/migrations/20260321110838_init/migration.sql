-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "skills" TEXT,
    "oneOnOneDay" TEXT,
    "oneOnOneTime" TEXT,
    "coachingNotes" TEXT,
    "hireDate" TIMESTAMP(3),
    "delegationLevel" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "department" TEXT NOT NULL,
    "stage" TEXT NOT NULL DEFAULT 'planning',
    "ownerId" TEXT,
    "stakeholderId" TEXT,
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "assigneeId" TEXT,
    "isSelfTask" BOOLEAN NOT NULL DEFAULT false,
    "projectId" TEXT,
    "department" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'todo',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "stakeholderId" TEXT,
    "cadenceId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskActivity" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "from" TEXT,
    "to" TEXT,
    "note" TEXT,
    "source" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Stakeholder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "frequency" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'high',
    "context" TEXT,
    "strategy" TEXT,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Stakeholder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneOnOne" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "mood" TEXT NOT NULL DEFAULT 'neutral',
    "theirUpdates" TEXT,
    "myUpdates" TEXT,
    "feedbackGiven" TEXT,
    "developmentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OneOnOne_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneOnOneAction" (
    "id" TEXT NOT NULL,
    "oneOnOneId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OneOnOneAction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cadence" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "time" TEXT NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "scope" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cadence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CadencePrepItem" (
    "id" TEXT NOT NULL,
    "cadenceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "assigneeId" TEXT,
    "department" TEXT,
    "leadTimeDays" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CadencePrepItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailThread" (
    "id" TEXT NOT NULL,
    "gmailThreadId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "from" TEXT NOT NULL,
    "to" TEXT[],
    "lastMessageAt" TIMESTAMP(3) NOT NULL,
    "snippet" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "assigneeId" TEXT,
    "labels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isStarred" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaskEmailLink" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "emailThreadId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TaskEmailLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NumberEntry" (
    "id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "period" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'sheets',
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NumberEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "emailedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EmailThread_gmailThreadId_key" ON "EmailThread"("gmailThreadId");

-- CreateIndex
CREATE UNIQUE INDEX "TaskEmailLink_taskId_emailThreadId_key" ON "TaskEmailLink"("taskId", "emailThreadId");

-- CreateIndex
CREATE UNIQUE INDEX "NumberEntry_metric_period_key" ON "NumberEntry"("metric", "period");

-- CreateIndex
CREATE UNIQUE INDEX "Report_type_period_key" ON "Report"("type", "period");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_stakeholderId_fkey" FOREIGN KEY ("stakeholderId") REFERENCES "Stakeholder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_cadenceId_fkey" FOREIGN KEY ("cadenceId") REFERENCES "Cadence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskActivity" ADD CONSTRAINT "TaskActivity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneOnOne" ADD CONSTRAINT "OneOnOne_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "TeamMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneOnOneAction" ADD CONSTRAINT "OneOnOneAction_oneOnOneId_fkey" FOREIGN KEY ("oneOnOneId") REFERENCES "OneOnOne"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CadencePrepItem" ADD CONSTRAINT "CadencePrepItem_cadenceId_fkey" FOREIGN KEY ("cadenceId") REFERENCES "Cadence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailThread" ADD CONSTRAINT "EmailThread_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "TeamMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskEmailLink" ADD CONSTRAINT "TaskEmailLink_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaskEmailLink" ADD CONSTRAINT "TaskEmailLink_emailThreadId_fkey" FOREIGN KEY ("emailThreadId") REFERENCES "EmailThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
