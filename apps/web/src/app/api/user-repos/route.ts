import { NextResponse } from "next/server";
import { getUserRepos } from "@/lib/github";

interface SlimRepo {
	id: number;
	full_name: string;
	description: string | null;
	language: string | null;
	stargazers_count: number;
	owner: { login: string; avatar_url: string } | null;
}

export async function GET() {
	const repos = await getUserRepos("updated", 100);
	const repoList = Array.isArray(repos) ? repos : [];
	const slim: SlimRepo[] = repoList.map((r) => ({
		id: r.id,
		full_name: r.full_name,
		description: r.description ?? null,
		language: r.language ?? null,
		stargazers_count: r.stargazers_count ?? 0,
		owner: r.owner ? { login: r.owner.login, avatar_url: r.owner.avatar_url } : null,
	}));
	return NextResponse.json({ repos: slim });
}
