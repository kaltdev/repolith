import { prisma } from "./db";

export interface PinnedItem {
	id: string;
	userId: string;
	owner: string;
	repo: string;
	url: string;
	title: string;
	itemType: string;
	pinnedAt: string;
}

export async function getPinnedItems(
	userId: string,
	owner: string,
	repo: string,
): Promise<PinnedItem[]> {
	const rows = await prisma.pinnedItem.findMany({
		where: { userId, owner, repo },
		orderBy: { pinnedAt: "desc" },
	});
	return rows;
}

export async function getPinnedItemUrls(
	userId: string,
	owner: string,
	repo: string,
): Promise<string[]> {
	const rows = await prisma.pinnedItem.findMany({
		where: { userId, owner, repo },
		select: { url: true },
	});
	return rows.map((r) => r.url);
}

export async function pinItem(
	userId: string,
	owner: string,
	repo: string,
	url: string,
	title: string,
	itemType: string,
): Promise<PinnedItem> {
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	return prisma.pinnedItem.upsert({
		where: {
			userId_owner_repo_url: { userId, owner, repo, url },
		},
		create: { id, userId, owner, repo, url, title, itemType, pinnedAt: now },
		update: { title, itemType, pinnedAt: now },
	});
}

export async function unpinItem(
	userId: string,
	owner: string,
	repo: string,
	url: string,
): Promise<void> {
	await prisma.pinnedItem.deleteMany({
		where: { userId, owner, repo, url },
	});
}

export async function isItemPinned(
	userId: string,
	owner: string,
	repo: string,
	url: string,
): Promise<boolean> {
	const row = await prisma.pinnedItem.findFirst({
		where: { userId, owner, repo, url },
		select: { id: true },
	});
	return !!row;
}
