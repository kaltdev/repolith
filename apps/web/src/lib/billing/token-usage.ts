import type { LanguageModelUsage } from "ai";
import {
	calculateCostUsd,
	hasModelPricing,
	type CostDetails,
	type UsageDetails,
} from "./ai-models";
import { isBillingExemptUser } from "./billing-exemption";
import { getCreditBalance } from "./credit";
import { FIXED_COSTS } from "./config";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../db";

const TX_OPTIONS = {
	isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
	maxWait: 5000,
	timeout: 10000,
} as const;

const TX_MAX_RETRIES = 3;

/** Run a Serializable transaction with automatic retry on write conflicts (P2034). */
async function withSerializableTx<T>(fn: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
	for (let attempt = 0; ; attempt++) {
		try {
			return await prisma.$transaction(fn, TX_OPTIONS);
		} catch (e) {
			const isWriteConflict =
				e instanceof Prisma.PrismaClientKnownRequestError &&
				e.code === "P2034";
			if (isWriteConflict && attempt < TX_MAX_RETRIES) continue;
			throw e;
		}
	}
}

function buildUsageDetails(usage: LanguageModelUsage): UsageDetails {
	const input = usage.inputTokens ?? 0;
	const output = usage.outputTokens ?? 0;
	const cacheRead = usage.inputTokenDetails?.cacheReadTokens ?? undefined;
	const cacheWrite = usage.inputTokenDetails?.cacheWriteTokens ?? undefined;
	const reasoning = usage.outputTokenDetails?.reasoningTokens ?? undefined;
	const total = usage.totalTokens ?? input + output;

	const details: UsageDetails = { input, output, total };
	if (cacheRead) details.cacheRead = cacheRead;
	if (cacheWrite) details.cacheWrite = cacheWrite;
	if (reasoning) details.reasoning = reasoning;

	return details;
}

function toJsonOrNull(obj: UsageDetails | CostDetails): string | null {
	const { total: _, ...rest } = obj;
	const hasValues = Object.values(rest).some((v) => v !== undefined && v > 0);
	return hasValues ? JSON.stringify(obj) : null;
}

async function splitCost(
	tx: Prisma.TransactionClient,
	userId: string,
	fullCost: number,
): Promise<{ creditUsed: number; costUsd: number }> {
	const balance = await getCreditBalance(userId, tx);
	const creditUsed = Math.min(fullCost, balance.available);
	return { creditUsed, costUsd: 0 };
}

export async function logTokenUsage(params: {
	userId: string;
	provider: string;
	modelId: string;
	taskType: string;
	usage: LanguageModelUsage;
	isCustomApiKey: boolean;
	conversationId?: string | undefined;
}): Promise<void> {
	const usageDetails = buildUsageDetails(params.usage);
	const isBillingExempt = await isBillingExemptUser(params.userId);
	const costDetails =
		params.isCustomApiKey || !hasModelPricing(params.modelId)
			? null
			: calculateCostUsd(params.modelId, usageDetails);
	const fullCost = costDetails?.total ?? 0;

	await withSerializableTx(async (tx) => {
		const { creditUsed, costUsd } =
			params.isCustomApiKey || isBillingExempt || fullCost <= 0
				? { creditUsed: 0, costUsd: 0 }
				: await splitCost(tx, params.userId, fullCost);

		const aiCallLog = await tx.aiCallLog.create({
			data: {
				userId: params.userId,
				provider: params.provider,
				modelId: params.modelId,
				taskType: params.taskType,
				inputTokens: usageDetails.input,
				outputTokens: usageDetails.output,
				totalTokens: usageDetails.total,
				usageJson: toJsonOrNull(usageDetails),
				costJson: costDetails ? toJsonOrNull(costDetails) : null,
				usingOwnKey: params.isCustomApiKey,
				conversationId: params.conversationId,
			},
		});

		return tx.usageLog.create({
			data: {
				userId: params.userId,
				taskType: params.taskType,
				costUsd,
				creditUsed,
				aiCallLogId: aiCallLog.id,
				stripeReported: true,
				polarReported: true,
			},
		});
	});
}

export async function logFixedCostUsage(params: {
	userId: string;
	taskType: string;
	costUsd?: number | undefined;
}): Promise<void> {
	const fullCost =
		params.costUsd ?? FIXED_COSTS[params.taskType as keyof typeof FIXED_COSTS] ?? 0;
	const isBillingExempt = await isBillingExemptUser(params.userId);

	await withSerializableTx(async (tx) => {
		const { creditUsed, costUsd } =
			!isBillingExempt && fullCost > 0
				? await splitCost(tx, params.userId, fullCost)
				: { creditUsed: 0, costUsd: 0 };

		return tx.usageLog.create({
			data: {
				userId: params.userId,
				taskType: params.taskType,
				costUsd,
				creditUsed,
				stripeReported: true,
				polarReported: true,
			},
		});
	});
}
