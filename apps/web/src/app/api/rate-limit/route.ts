import { NextResponse } from "next/server";
import { getOctokit } from "@/lib/github";

export async function GET() {
	const octokit = await getOctokit();
	if (!octokit) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	try {
		const { data } = await octokit.rateLimit.get();
		const core = data.resources.core;
		return NextResponse.json({
			limit: core.limit,
			remaining: core.remaining,
			used: core.used,
			resetAt: core.reset, // unix timestamp in seconds
		});
	} catch {
		return NextResponse.json({ error: "Failed to fetch rate limit" }, { status: 500 });
	}
}
