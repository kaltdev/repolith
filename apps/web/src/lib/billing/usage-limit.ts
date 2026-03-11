import { isBillingExemptUser } from "./billing-exemption";
import { getCreditBalance } from "./credit";
import { getCurrentPeriodUsage, getSpendingLimit } from "./spending-limit";

export async function checkUsageLimit(
	userId: string,
	isCustomApiKey = false,
): Promise<{
	allowed: boolean;
	current: number;
	limit: number;
	creditExhausted?: boolean;
	spendingLimitReached?: boolean;
}> {
	if (isCustomApiKey) {
		return { allowed: true, current: 0, limit: 0 };
	}

	if (await isBillingExemptUser(userId)) {
		return { allowed: true, current: 0, limit: 0 };
	}

	const monthStart = new Date();
	monthStart.setUTCDate(1);
	monthStart.setUTCHours(0, 0, 0, 0);

	const [monthlyCapUsd, currentUsageUsd, balance] = await Promise.all([
		getSpendingLimit(userId),
		getCurrentPeriodUsage(userId, monthStart),
		getCreditBalance(userId),
	]);

	if (monthlyCapUsd !== null && currentUsageUsd >= monthlyCapUsd) {
		return {
			allowed: false,
			current: 0,
			limit: 0,
			spendingLimitReached: true,
		};
	}

	if (balance.available <= 0) {
		return {
			allowed: false,
			current: 0,
			limit: 0,
			creditExhausted: true,
		};
	}

	return { allowed: true, current: 0, limit: 0 };
}
