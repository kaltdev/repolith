import { prisma } from "../db";
import { MIN_CAP_USD } from "./config";

export async function getSpendingLimit(userId: string): Promise<number | null> {
	const config = await prisma.spendingLimit.findUnique({ where: { userId } });
	return config ? Number(config.monthlyCapUsd) : null;
}

export async function updateSpendingLimit(
	userId: string,
	monthlyCapUsd: number | null,
): Promise<number | null> {
	if (monthlyCapUsd === null) {
		await prisma.spendingLimit.deleteMany({ where: { userId } });
		return null;
	}
	if (monthlyCapUsd < MIN_CAP_USD) {
		throw new Error(`Spending limit must be at least $${MIN_CAP_USD}`);
	}
	const config = await prisma.spendingLimit.upsert({
		where: { userId },
		create: { userId, monthlyCapUsd },
		update: { monthlyCapUsd },
	});
	return Number(config.monthlyCapUsd);
}

/** Total app-funded usage value in the period, including consumed credits. */
export async function getCurrentPeriodUsage(userId: string, periodStart: Date): Promise<number> {
	const result = await prisma.usageLog.aggregate({
		where: { userId, createdAt: { gte: periodStart } },
		_sum: { costUsd: true, creditUsed: true },
	});
	return Number(result._sum.costUsd ?? 0) + Number(result._sum.creditUsed ?? 0);
}
