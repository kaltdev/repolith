import { NextRequest, NextResponse } from "next/server";
import { getOctokit } from "@/lib/github";

export async function GET(request: NextRequest) {
	const { searchParams } = request.nextUrl;
	const owner = searchParams.get("owner");
	const repo = searchParams.get("repo");
	const workflowId = searchParams.get("workflow_id");

	if (!owner || !repo) {
		return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 });
	}

	const octokit = await getOctokit();
	if (!octokit) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const page = Math.max(Number(searchParams.get("page")) || 1, 1);
	const perPage = Math.min(Math.max(Number(searchParams.get("per_page")) || 30, 1), 100);

	if (workflowId) {
		const { data } = await octokit.actions.listWorkflowRuns({
			owner,
			repo,
			workflow_id: Number(workflowId),
			page,
			per_page: perPage,
		});
		return NextResponse.json({
			total_count: data.total_count,
			workflow_runs: data.workflow_runs,
		});
	}

	const { data } = await octokit.actions.listWorkflowRunsForRepo({
		owner,
		repo,
		page,
		per_page: perPage,
	});
	return NextResponse.json({
		total_count: data.total_count,
		workflow_runs: data.workflow_runs,
	});
}
