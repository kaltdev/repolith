import { NextRequest, NextResponse } from "next/server";
import { getOctokit } from "@/lib/github";

export async function GET(request: NextRequest) {
	const { searchParams } = request.nextUrl;
	const owner = searchParams.get("owner");
	const repo = searchParams.get("repo");
	const runIds = searchParams.getAll("run_ids");

	if (!owner || !repo) {
		return NextResponse.json({ error: "Missing owner or repo" }, { status: 400 });
	}

	if (runIds.length < 2) {
		return NextResponse.json({ error: "Need at least 2 run IDs" }, { status: 400 });
	}

	if (runIds.length > 10) {
		return NextResponse.json({ error: "Maximum 10 runs allowed" }, { status: 400 });
	}

	const octokit = await getOctokit();
	if (!octokit) {
		return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
	}

	const runs = await Promise.all(
		runIds.map(async (id) => {
			const runId = Number(id);
			const [runRes, jobsRes] = await Promise.all([
				octokit.actions.getWorkflowRun({ owner, repo, run_id: runId }),
				octokit.actions.listJobsForWorkflowRun({
					owner,
					repo,
					run_id: runId,
					per_page: 100,
				}),
			]);
			return {
				run: runRes.data,
				jobs: jobsRes.data.jobs,
			};
		}),
	);

	return NextResponse.json({ runs });
}
