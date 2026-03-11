import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../db";

export interface CreditBalance {
	totalGranted: number;
	totalUsed: number;
	available: number;
}

export async function getNearestCreditExpiry(userId: string): Promise<Date | null> {
	const grant = await prisma.creditLedger.findFirst({
		where: { userId, expiresAt: { gt: new Date() } },
		orderBy: { expiresAt: "asc" },
		select: { expiresAt: true },
	});
	return grant?.expiresAt ?? null;
}

export async function getCreditBalance(
	userId: string,
	tx?: Prisma.TransactionClient,
): Promise<CreditBalance> {
	const db = tx ?? prisma;
	const [grants, usageAgg] = await Promise.all([
		db.creditLedger.findMany({
			where: { userId },
			orderBy: { createdAt: "asc" },
			select: { amount: true, expiresAt: true },
		}),
		db.usageLog.aggregate({
			where: { userId },
			_sum: { creditUsed: true },
		}),
	]);

	const totalUsed = Number(usageAgg._sum.creditUsed ?? 0);
	const totalGranted = grants.reduce((sum, g) => sum + Number(g.amount), 0);
	const now = new Date();

	// FIFO: oldest grants absorb usage first; expired remainders are forfeit.
	let usageToConsume = totalUsed;
	let available = 0;
	for (const grant of grants) {
		const amount = Number(grant.amount);
		const consumed = Math.min(amount, usageToConsume);
		usageToConsume -= consumed;

		if (!grant.expiresAt || grant.expiresAt > now) {
			available += amount - consumed;
		}
	}

	return { totalGranted, totalUsed, available };
}
