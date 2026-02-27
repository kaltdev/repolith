import { NextRequest, NextResponse } from "next/server";
import { getOctokit } from "@/lib/github";

interface SearchUser {
	login: string;
	id: number;
	avatar_url: string;
	html_url: string;
	type: string;
	[key: string]: unknown;
}

export async function GET(request: NextRequest) {
	const { searchParams } = request.nextUrl;
	const q = searchParams.get("q");
	if (!q) {
		return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
	}

	const octokit = await getOctokit();
	if (!octokit) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const org = searchParams.get("org") || "";
	const perPage = Math.min(Math.max(Number(searchParams.get("per_page")) || 30, 1), 100);

	if (org) {
		try {
			const [orgRes, globalRes] = await Promise.all([
				octokit.search.users({
					q: `${q} org:${org}`,
					per_page: perPage,
				}),
				octokit.search.users({
					q,
					per_page: perPage,
				}),
			]);

			const seen = new Set<string>();
			const merged: SearchUser[] = [];

			for (const u of orgRes.data.items) {
				if (!seen.has(u.login)) {
					seen.add(u.login);
					merged.push(u as SearchUser);
				}
			}
			for (const u of globalRes.data.items) {
				if (!seen.has(u.login) && merged.length < perPage) {
					seen.add(u.login);
					merged.push(u as SearchUser);
				}
			}

			return NextResponse.json({
				total_count: merged.length,
				items: merged,
			});
		} catch {
			// Fall through to plain search if org search fails
		}
	}

	const { data } = await octokit.search.users({
		q,
		per_page: perPage,
	});

	return NextResponse.json(data);
}
