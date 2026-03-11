-- CreateTable
CREATE TABLE "polar_purchase_grants" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "polarOrderId" TEXT NOT NULL,
    "polarCheckoutId" TEXT,
    "polarCustomerId" TEXT NOT NULL,
    "polarProductId" TEXT NOT NULL,
    "packSlug" TEXT NOT NULL,
    "packName" TEXT NOT NULL,
    "amountPaidUsd" DECIMAL(10,6) NOT NULL,
    "grantedAmountUsd" DECIMAL(10,6) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'paid',
    "sourceEventType" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "polar_purchase_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polar_purchase_grant_reversals" (
    "id" TEXT NOT NULL,
    "purchaseGrantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "polarRefundId" TEXT NOT NULL,
    "polarOrderId" TEXT NOT NULL,
    "polarCustomerId" TEXT NOT NULL,
    "amountRefundedUsd" DECIMAL(10,6) NOT NULL,
    "intendedReversalAmountUsd" DECIMAL(10,6) NOT NULL,
    "appliedReversalAmountUsd" DECIMAL(10,6) NOT NULL,
    "unrecoveredAmountUsd" DECIMAL(10,6) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "refundStatus" TEXT NOT NULL,
    "refundReason" TEXT,
    "sourceEventType" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "polar_purchase_grant_reversals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "polar_purchase_grants_polarOrderId_key" ON "polar_purchase_grants"("polarOrderId");

-- CreateIndex
CREATE INDEX "polar_purchase_grants_userId_createdAt_idx" ON "polar_purchase_grants"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "polar_purchase_grants_polarCustomerId_createdAt_idx" ON "polar_purchase_grants"("polarCustomerId", "createdAt");

-- CreateIndex
CREATE INDEX "polar_purchase_grants_polarProductId_createdAt_idx" ON "polar_purchase_grants"("polarProductId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "polar_purchase_grant_reversals_polarRefundId_key" ON "polar_purchase_grant_reversals"("polarRefundId");

-- CreateIndex
CREATE INDEX "polar_purchase_grant_reversals_purchaseGrantId_createdAt_idx" ON "polar_purchase_grant_reversals"("purchaseGrantId", "createdAt");

-- CreateIndex
CREATE INDEX "polar_purchase_grant_reversals_userId_createdAt_idx" ON "polar_purchase_grant_reversals"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "polar_purchase_grant_reversals_refundStatus_createdAt_idx" ON "polar_purchase_grant_reversals"("refundStatus", "createdAt");

-- AddForeignKey
ALTER TABLE "polar_purchase_grants" ADD CONSTRAINT "polar_purchase_grants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polar_purchase_grant_reversals" ADD CONSTRAINT "polar_purchase_grant_reversals_purchaseGrantId_fkey" FOREIGN KEY ("purchaseGrantId") REFERENCES "polar_purchase_grants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polar_purchase_grant_reversals" ADD CONSTRAINT "polar_purchase_grant_reversals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
