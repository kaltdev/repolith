import { prisma } from "./db";

const FREE_MESSAGE_LIMIT = 20;

export async function checkAiLimit(
	userId: string,
): Promise<{ allowed: boolean; current: number; limit: number }> {
	// Check if user has their own API key — bypass limit
	const settings = await prisma.userSettings.findUnique({
		where: { userId },
		select: { useOwnApiKey: true, openrouterApiKey: true },
	});
	if (settings?.useOwnApiKey && settings.openrouterApiKey) {
		return { allowed: true, current: 0, limit: FREE_MESSAGE_LIMIT };
	}

	const user = await prisma.user.findUnique({
		where: { id: userId },
		select: { aiMessageCount: true },
	});
	const current = user?.aiMessageCount ?? 0;
	return {
		allowed: current < FREE_MESSAGE_LIMIT,
		current,
		limit: FREE_MESSAGE_LIMIT,
	};
}

export async function incrementAiUsage(userId: string): Promise<void> {
	await prisma.user.update({
		where: { id: userId },
		data: { aiMessageCount: { increment: 1 } },
	});
}
