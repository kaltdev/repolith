import { redis } from "./redis";

function readmeKey(owner: string, repo: string): string {
	return `readme_html:${owner.toLowerCase()}/${repo.toLowerCase()}`;
}

export async function getCachedReadmeHtml(owner: string, repo: string): Promise<string | null> {
	return redis.get<string>(readmeKey(owner, repo));
}

export async function setCachedReadmeHtml(
	owner: string,
	repo: string,
	html: string,
): Promise<void> {
	await redis.set(readmeKey(owner, repo), html, { ex: 60 * 60 });
}

export async function deleteCachedReadmeHtml(owner: string, repo: string): Promise<void> {
	await redis.del(readmeKey(owner, repo));
}
