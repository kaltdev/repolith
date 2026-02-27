import { NextRequest, NextResponse } from "next/server";
import { getOctokit } from "@/lib/github";

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

	const page = Math.max(Number(searchParams.get("page")) || 1, 1);
	const perPage = Math.min(Math.max(Number(searchParams.get("per_page")) || 30, 1), 100);

	const { data } = await octokit.search.issuesAndPullRequests({
		q: `is:issue ${q}`,
		page,
		per_page: perPage,
		sort: "updated",
		order: "desc",
	});

	return NextResponse.json(data);
}
