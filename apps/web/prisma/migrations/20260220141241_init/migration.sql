-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_cache_entries" (
    "userId" TEXT NOT NULL,
    "cacheKey" TEXT NOT NULL,
    "cacheType" TEXT NOT NULL,
    "dataJson" TEXT NOT NULL,
    "syncedAt" TEXT NOT NULL,
    "etag" TEXT,

    CONSTRAINT "github_cache_entries_pkey" PRIMARY KEY ("userId","cacheKey")
);

-- CreateTable
CREATE TABLE "github_sync_jobs" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "payloadJson" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TEXT NOT NULL,
    "startedAt" TEXT,
    "lastError" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "github_sync_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_conversations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "chatType" TEXT NOT NULL,
    "contextKey" TEXT NOT NULL,
    "title" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "chat_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ghost_tabs" (
    "userId" TEXT NOT NULL,
    "tabId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "ghost_tabs_pkey" PRIMARY KEY ("userId","tabId")
);

-- CreateTable
CREATE TABLE "ghost_tab_state" (
    "userId" TEXT NOT NULL,
    "activeTabId" TEXT NOT NULL,
    "counter" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ghost_tab_state_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "user_settings" (
    "userId" TEXT NOT NULL,
    "displayName" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "colorTheme" TEXT NOT NULL DEFAULT 'midnight',
    "ghostModel" TEXT NOT NULL DEFAULT 'auto',
    "useOwnApiKey" BOOLEAN NOT NULL DEFAULT false,
    "openrouterApiKey" TEXT,
    "githubPat" TEXT,
    "codeThemeLight" TEXT NOT NULL DEFAULT 'vitesse-light',
    "codeThemeDark" TEXT NOT NULL DEFAULT 'vitesse-black',
    "codeFont" TEXT NOT NULL DEFAULT 'default',
    "codeFontSize" INTEGER NOT NULL DEFAULT 13,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "user_settings_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "custom_code_themes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'dark',
    "themeJson" TEXT NOT NULL,
    "bgColor" TEXT NOT NULL,
    "fgColor" TEXT NOT NULL,
    "accentColor" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "custom_code_themes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "github_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "avatarUrl" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "pat" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TEXT NOT NULL,

    CONSTRAINT "github_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prompt_requests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "prNumber" INTEGER,
    "conversationId" TEXT,
    "errorMessage" TEXT,
    "ghostTabId" TEXT,
    "progress" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "prompt_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_embeddings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentKey" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "repo" TEXT NOT NULL,
    "itemNumber" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "embeddingJson" TEXT NOT NULL,
    "title" TEXT,
    "snippet" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,

    CONSTRAINT "search_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "github_cache_entries_userId_cacheType_idx" ON "github_cache_entries"("userId", "cacheType");

-- CreateIndex
CREATE INDEX "github_sync_jobs_userId_status_nextAttemptAt_id_idx" ON "github_sync_jobs"("userId", "status", "nextAttemptAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "idx_github_sync_jobs_dedupe_active" ON "github_sync_jobs"("userId", "dedupeKey");

-- CreateIndex
CREATE INDEX "chat_conversations_userId_chatType_idx" ON "chat_conversations"("userId", "chatType");

-- CreateIndex
CREATE UNIQUE INDEX "chat_conversations_userId_contextKey_key" ON "chat_conversations"("userId", "contextKey");

-- CreateIndex
CREATE INDEX "chat_messages_conversationId_createdAt_idx" ON "chat_messages"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "prompt_requests_owner_repo_status_idx" ON "prompt_requests"("owner", "repo", "status");

-- CreateIndex
CREATE INDEX "prompt_requests_userId_idx" ON "prompt_requests"("userId");

-- CreateIndex
CREATE INDEX "search_embeddings_userId_owner_repo_idx" ON "search_embeddings"("userId", "owner", "repo");

-- CreateIndex
CREATE INDEX "search_embeddings_userId_contentType_contentKey_idx" ON "search_embeddings"("userId", "contentType", "contentKey");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "chat_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
