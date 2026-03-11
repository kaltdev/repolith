import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../db";
import {
	POLAR_PURCHASE_CREDIT_TYPE,
	POLAR_REFUND_DEFICIT_TYPE,
	POLAR_REFUND_REVERSAL_TYPE,
} from "./config";
import { getConfiguredCreditPackByProductId, usdToCredits } from "./credit-packs";
import { getCreditBalance } from "./credit";

const TX_OPTIONS = {
	isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
	maxWait: 5000,
	timeout: 10000,
} as const;

const TX_MAX_RETRIES = 3;

export interface RefundOutcome {
	appliedReversalAmountUsd: number;
	unrecoveredAmountUsd: number;
}

export interface PurchaseGrantResult {
	created: boolean;
	grantId: string;
}

export interface PurchaseReversalResult {
	created: boolean;
	reversalId: string;
	outcome: RefundOutcome;
}

function roundUsd(value: number): number {
	return Number(value.toFixed(6));
}

async function withSerializableTx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await prisma.$transaction(fn, TX_OPTIONS);
		} catch (error) {
			const isWriteConflict =
				error instanceof Prisma.PrismaClientKnownRequestError &&
				error.code === "P2034";
			if (isWriteConflict && attempt < TX_MAX_RETRIES) continue;
			throw error;
		}
	}
}

async function resolvePolarUserId(
	tx: Prisma.TransactionClient,
	externalUserId: string | null | undefined,
	polarCustomerId: string,
): Promise<string | null> {
	if (externalUserId) {
		const user = await tx.user.findUnique({
			where: { id: externalUserId },
			select: { id: true },
		});
		if (user) return user.id;
	}

	const user = await tx.user.findFirst({
		where: { polarCustomerId },
		select: { id: true },
	});
	return user?.id ?? null;
}

function describePurchase(packName: string, credits: number, polarOrderId: string): string {
	return `Polar ${packName} purchase (${credits} credits, order ${polarOrderId})`;
}

function describeReversal(packName: string, credits: number, polarRefundId: string): string {
	return `Polar refund reversal for ${packName} (${credits} credits, refund ${polarRefundId})`;
}

function describeDeficit(packName: string, credits: number, polarRefundId: string): string {
	return `Refund deficit for ${packName} (${credits} credits unrecovered, refund ${polarRefundId})`;
}

export function calculateRefundOutcome(
	availableUsd: number,
	intendedReversalAmountUsd: number,
): RefundOutcome {
	const appliedReversalAmountUsd = roundUsd(
		Math.min(availableUsd, intendedReversalAmountUsd),
	);
	return {
		appliedReversalAmountUsd,
		unrecoveredAmountUsd: roundUsd(
			intendedReversalAmountUsd - appliedReversalAmountUsd,
		),
	};
}

export function calculateIntendedReversalAmount(params: {
	grantedAmountUsd: number;
	amountPaidUsd: number;
	amountRefundedUsd: number;
	previouslyIntendedReversedUsd: number;
}): number {
	const {
		grantedAmountUsd,
		amountPaidUsd,
		amountRefundedUsd,
		previouslyIntendedReversedUsd,
	} = params;

	if (grantedAmountUsd <= 0 || amountPaidUsd <= 0 || amountRefundedUsd <= 0) {
		return 0;
	}

	const prorated = roundUsd((grantedAmountUsd * amountRefundedUsd) / amountPaidUsd);
	const remaining = roundUsd(grantedAmountUsd - previouslyIntendedReversedUsd);
	return roundUsd(Math.max(0, Math.min(prorated, remaining)));
}

export async function grantCreditsForPaidPolarOrder(params: {
	polarOrderId: string;
	polarCheckoutId?: string | null;
	polarCustomerId: string;
	polarExternalUserId?: string | null;
	polarProductId: string;
	amountPaidUsd: number;
	currency: string;
	sourceEventType: string;
	metadataJson?: string | null;
}): Promise<PurchaseGrantResult> {
	const pack = getConfiguredCreditPackByProductId(params.polarProductId);
	if (!pack) {
		throw new Error(`Unknown Polar credit pack product: ${params.polarProductId}`);
	}

	try {
		return await withSerializableTx(async (tx) => {
			const existing = await tx.polarPurchaseGrant.findUnique({
				where: { polarOrderId: params.polarOrderId },
				select: { id: true },
			});
			if (existing) {
				return { created: false, grantId: existing.id };
			}

			const userId = await resolvePolarUserId(
				tx,
				params.polarExternalUserId,
				params.polarCustomerId,
			);
			if (!userId) {
				throw new Error(
					`Unable to resolve user for Polar order ${params.polarOrderId}`,
				);
			}

			const grant = await tx.polarPurchaseGrant.create({
				data: {
					userId,
					polarOrderId: params.polarOrderId,
					polarCheckoutId: params.polarCheckoutId ?? null,
					polarCustomerId: params.polarCustomerId,
					polarProductId: params.polarProductId,
					packSlug: pack.slug,
					packName: pack.name,
					amountPaidUsd: roundUsd(params.amountPaidUsd),
					grantedAmountUsd: roundUsd(pack.grantedAmountUsd),
					currency: params.currency,
					status: "paid",
					sourceEventType: params.sourceEventType,
					metadataJson: params.metadataJson ?? null,
				},
			});

			await tx.creditLedger.create({
				data: {
					userId,
					amount: roundUsd(pack.grantedAmountUsd),
					type: POLAR_PURCHASE_CREDIT_TYPE,
					description: describePurchase(
						pack.name,
						pack.credits,
						params.polarOrderId,
					),
				},
			});

			return { created: true, grantId: grant.id };
		});
	} catch (error) {
		const isDuplicate =
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002";
		if (!isDuplicate) throw error;

		const existing = await prisma.polarPurchaseGrant.findUnique({
			where: { polarOrderId: params.polarOrderId },
			select: { id: true },
		});
		if (!existing) throw error;
		return { created: false, grantId: existing.id };
	}
}

export async function applyPolarRefundToCredits(params: {
	polarRefundId: string;
	polarOrderId: string;
	polarCustomerId: string;
	amountRefundedUsd: number;
	currency: string;
	refundStatus: string;
	refundReason?: string | null;
	sourceEventType: string;
	metadataJson?: string | null;
}): Promise<PurchaseReversalResult> {
	try {
		return await withSerializableTx(async (tx) => {
			const existing = await tx.polarPurchaseGrantReversal.findUnique({
				where: { polarRefundId: params.polarRefundId },
				select: {
					id: true,
					appliedReversalAmountUsd: true,
					unrecoveredAmountUsd: true,
				},
			});
			if (existing) {
				return {
					created: false,
					reversalId: existing.id,
					outcome: {
						appliedReversalAmountUsd: Number(
							existing.appliedReversalAmountUsd,
						),
						unrecoveredAmountUsd: Number(
							existing.unrecoveredAmountUsd,
						),
					},
				};
			}

			const grant = await tx.polarPurchaseGrant.findUnique({
				where: { polarOrderId: params.polarOrderId },
				select: {
					id: true,
					userId: true,
					polarCustomerId: true,
					packName: true,
					packSlug: true,
					amountPaidUsd: true,
					grantedAmountUsd: true,
				},
			});
			if (!grant) {
				throw new Error(
					`Missing purchase grant for refunded Polar order ${params.polarOrderId}`,
				);
			}

			const previousReversals = await tx.polarPurchaseGrantReversal.aggregate({
				where: { purchaseGrantId: grant.id },
				_sum: { intendedReversalAmountUsd: true },
			});
			const intendedReversalAmountUsd = calculateIntendedReversalAmount({
				grantedAmountUsd: Number(grant.grantedAmountUsd),
				amountPaidUsd: Number(grant.amountPaidUsd),
				amountRefundedUsd: params.amountRefundedUsd,
				previouslyIntendedReversedUsd: Number(
					previousReversals._sum.intendedReversalAmountUsd ?? 0,
				),
			});
			const availableBalance = await getCreditBalance(grant.userId, tx);
			const outcome = calculateRefundOutcome(
				availableBalance.available,
				intendedReversalAmountUsd,
			);
			const reversal = await tx.polarPurchaseGrantReversal.create({
				data: {
					purchaseGrantId: grant.id,
					userId: grant.userId,
					polarRefundId: params.polarRefundId,
					polarOrderId: params.polarOrderId,
					polarCustomerId:
						params.polarCustomerId || grant.polarCustomerId,
					amountRefundedUsd: roundUsd(params.amountRefundedUsd),
					intendedReversalAmountUsd,
					appliedReversalAmountUsd: outcome.appliedReversalAmountUsd,
					unrecoveredAmountUsd: outcome.unrecoveredAmountUsd,
					currency: params.currency,
					status:
						outcome.unrecoveredAmountUsd > 0
							? "pending_review"
							: "applied",
					refundStatus: params.refundStatus,
					refundReason: params.refundReason ?? null,
					sourceEventType: params.sourceEventType,
					metadataJson: params.metadataJson ?? null,
				},
			});

			if (outcome.appliedReversalAmountUsd > 0) {
				await tx.creditLedger.create({
					data: {
						userId: grant.userId,
						amount: -outcome.appliedReversalAmountUsd,
						type: POLAR_REFUND_REVERSAL_TYPE,
						description: describeReversal(
							grant.packName,
							usdToCredits(
								outcome.appliedReversalAmountUsd,
							),
							params.polarRefundId,
						),
					},
				});
			}

			if (outcome.unrecoveredAmountUsd > 0) {
				await tx.creditLedger.create({
					data: {
						userId: grant.userId,
						amount: 0,
						type: POLAR_REFUND_DEFICIT_TYPE,
						description: describeDeficit(
							grant.packName,
							usdToCredits(outcome.unrecoveredAmountUsd),
							params.polarRefundId,
						),
					},
				});
			}

			return {
				created: true,
				reversalId: reversal.id,
				outcome,
			};
		});
	} catch (error) {
		const isDuplicate =
			error instanceof Prisma.PrismaClientKnownRequestError &&
			error.code === "P2002";
		if (!isDuplicate) throw error;

		const existing = await prisma.polarPurchaseGrantReversal.findUnique({
			where: { polarRefundId: params.polarRefundId },
			select: {
				id: true,
				appliedReversalAmountUsd: true,
				unrecoveredAmountUsd: true,
			},
		});
		if (!existing) throw error;

		return {
			created: false,
			reversalId: existing.id,
			outcome: {
				appliedReversalAmountUsd: Number(existing.appliedReversalAmountUsd),
				unrecoveredAmountUsd: Number(existing.unrecoveredAmountUsd),
			},
		};
	}
}

export async function listPolarRefundDeficits() {
	return prisma.polarPurchaseGrantReversal.findMany({
		where: { unrecoveredAmountUsd: { gt: 0 } },
		orderBy: { createdAt: "desc" },
	});
}
