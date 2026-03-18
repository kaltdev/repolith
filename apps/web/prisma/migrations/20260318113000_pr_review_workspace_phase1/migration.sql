-- CreateTable
CREATE TABLE "pull_request_review_workspaces" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "pullNumber" INTEGER NOT NULL,
    "headSha" TEXT NOT NULL,
    "baseSha" TEXT NOT NULL,
    "draftBody" TEXT,
    "pendingVerdict" TEXT,
    "hideViewedFiles" BOOLEAN NOT NULL DEFAULT false,
    "splitView" BOOLEAN,
    "wordWrap" BOOLEAN,
    "defaultViewMode" TEXT,
    "fontSize" TEXT,
    "showFolderDiffCount" BOOLEAN,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "pull_request_review_workspaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pull_request_draft_comments" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "side" TEXT,
    "startLine" INTEGER,
    "endLine" INTEGER,
    "lineFingerprint" TEXT,
    "headSha" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "threadId" TEXT,
    "replyToCommentId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "pull_request_draft_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pull_request_suggestions" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "draftCommentId" TEXT,
    "githubCommentId" INTEGER,
    "path" TEXT NOT NULL,
    "side" TEXT NOT NULL DEFAULT 'RIGHT',
    "startLine" INTEGER NOT NULL,
    "endLine" INTEGER NOT NULL,
    "originalCode" TEXT NOT NULL,
    "suggestedCode" TEXT NOT NULL,
    "originalFingerprint" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "applyDisabledReason" TEXT,
    "appliedCommitSha" TEXT,
    "appliedAt" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "pull_request_suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pull_request_reviewer_file_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "pullNumber" INTEGER NOT NULL,
    "path" TEXT NOT NULL,
    "fileFingerprint" TEXT NOT NULL,
    "viewed" BOOLEAN NOT NULL DEFAULT false,
    "lastViewedAt" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "pull_request_reviewer_file_states_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pull_request_checklist_states" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "pullNumber" INTEGER NOT NULL,
    "itemKey" TEXT NOT NULL,
    "itemFingerprint" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "pull_request_checklist_states_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pull_request_review_workspaces_userId_owner_repo_pullNumber_key" ON "pull_request_review_workspaces"("userId", "owner", "repo", "pullNumber");

-- CreateIndex
CREATE INDEX "pull_request_review_workspaces_owner_repo_pullNumber_idx" ON "pull_request_review_workspaces"("owner", "repo", "pullNumber");

-- CreateIndex
CREATE INDEX "pull_request_review_workspaces_userId_updatedAt_idx" ON "pull_request_review_workspaces"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "pull_request_draft_comments_workspaceId_createdAt_idx" ON "pull_request_draft_comments"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "pull_request_draft_comments_workspaceId_status_idx" ON "pull_request_draft_comments"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "pull_request_draft_comments_workspaceId_path_idx" ON "pull_request_draft_comments"("workspaceId", "path");

-- CreateIndex
CREATE INDEX "pull_request_suggestions_workspaceId_createdAt_idx" ON "pull_request_suggestions"("workspaceId", "createdAt");

-- CreateIndex
CREATE INDEX "pull_request_suggestions_workspaceId_status_idx" ON "pull_request_suggestions"("workspaceId", "status");

-- CreateIndex
CREATE INDEX "pull_request_suggestions_workspaceId_path_idx" ON "pull_request_suggestions"("workspaceId", "path");

-- CreateIndex
CREATE INDEX "pull_request_suggestions_draftCommentId_idx" ON "pull_request_suggestions"("draftCommentId");

-- CreateIndex
CREATE UNIQUE INDEX "pull_request_reviewer_file_states_userId_owner_repo_pullNumber_path_key" ON "pull_request_reviewer_file_states"("userId", "owner", "repo", "pullNumber", "path");

-- CreateIndex
CREATE INDEX "pull_request_reviewer_file_states_owner_repo_pullNumber_viewed_idx" ON "pull_request_reviewer_file_states"("owner", "repo", "pullNumber", "viewed");

-- CreateIndex
CREATE INDEX "pull_request_reviewer_file_states_userId_updatedAt_idx" ON "pull_request_reviewer_file_states"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "pull_request_checklist_states_userId_owner_repo_pullNumber_itemKey_key" ON "pull_request_checklist_states"("userId", "owner", "repo", "pullNumber", "itemKey");

-- CreateIndex
CREATE INDEX "pull_request_checklist_states_owner_repo_pullNumber_idx" ON "pull_request_checklist_states"("owner", "repo", "pullNumber");

-- CreateIndex
CREATE INDEX "pull_request_checklist_states_userId_updatedAt_idx" ON "pull_request_checklist_states"("userId", "updatedAt");

-- AddForeignKey
ALTER TABLE "pull_request_draft_comments" ADD CONSTRAINT "pull_request_draft_comments_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "pull_request_review_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_request_suggestions" ADD CONSTRAINT "pull_request_suggestions_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "pull_request_review_workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pull_request_suggestions" ADD CONSTRAINT "pull_request_suggestions_draftCommentId_fkey" FOREIGN KEY ("draftCommentId") REFERENCES "pull_request_draft_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
