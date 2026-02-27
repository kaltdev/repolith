import { NextRequest, NextResponse } from "next/server";
import { getOrgRepos } from "@/lib/github";

interface SlimRepo {
	name: string;
	full_name: string;
	description: string | null;
	stargazers_count: number;
	private: boolean;
}

export async function GET(request: NextRequest) {
	const org = request.nextUrl.searchParams.get("org");
	if (!org) {
		return NextResponse.json({ error: "Missing org parameter" }, { status: 400 });
	}

	const repos = await getOrgRepos(org, { perPage: 100, sort: "pushed" });
	const repoList = Array.isArray(repos) ? repos : [];
	const slim: SlimRepo[] = repoList.map((r) => ({
		name: r.name,
		full_name: r.full_name,
		description: r.description ?? null,
		stargazers_count: r.stargazers_count ?? 0,
		private: r.private ?? false,
	}));
	return NextResponse.json({ repos: slim });
}
