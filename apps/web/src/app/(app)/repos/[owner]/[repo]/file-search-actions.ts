"use server";

import { getRepoTree, getFileContent } from "@/lib/github";

interface TreeEntry {
	type?: string;
	path?: string;
}

export async function searchRepoFiles(
	owner: string,
	repo: string,
	ref: string,
	query: string,
): Promise<{ path: string }[]> {
	const tree = await getRepoTree(owner, repo, ref, true);
	if (!tree?.tree) return [];

	const q = query.toLowerCase();
	return (tree.tree as TreeEntry[])
		.filter(
			(item) =>
				item.type === "blob" &&
				item.path &&
				item.path.toLowerCase().includes(q),
		)
		.slice(0, 15)
		.map((item) => ({ path: item.path as string }));
}

export async function fetchFileContentForContext(
	owner: string,
	repo: string,
	path: string,
	ref: string,
): Promise<{ filename: string; content: string } | null> {
	const file = await getFileContent(owner, repo, path, ref);
	if (!file) return null;

	const fileData = file as { content?: string };
	const content =
		typeof fileData.content === "string"
			? fileData.content
			: typeof file === "string"
				? file
				: "";

	if (!content) return null;

	return {
		filename: path,
		content: content.slice(0, 50_000),
	};
}
