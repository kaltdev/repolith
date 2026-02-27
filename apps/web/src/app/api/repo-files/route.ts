import { NextRequest, NextResponse } from "next/server";
import { getRepo, getRepoTree } from "@/lib/github";

interface TreeEntry {
	type?: string;
	path?: string;
	sha?: string;
	size?: number;
	mode?: string;
}

export async function GET(request: NextRequest) {
	const { searchParams } = request.nextUrl;
	const owner = searchParams.get("owner");
	const repo = searchParams.get("repo");

	if (!owner || !repo) {
		return NextResponse.json({ error: "Missing owner/repo" }, { status: 400 });
	}

	const repoData = await getRepo(owner, repo);
	if (!repoData) {
		return NextResponse.json({ error: "Repo not found" }, { status: 404 });
	}

	const defaultBranch = (repoData as { default_branch?: string }).default_branch ?? "main";
	const tree = await getRepoTree(owner, repo, defaultBranch, true);

	const treeEntries: TreeEntry[] = (tree as { tree?: TreeEntry[] })?.tree ?? [];
	const files = treeEntries
		.filter((item) => item.type === "blob" && item.path)
		.map((item) => item.path as string);

	return NextResponse.json({ files, defaultBranch });
}
