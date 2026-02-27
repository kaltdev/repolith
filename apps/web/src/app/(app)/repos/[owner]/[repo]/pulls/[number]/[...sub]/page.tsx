import { redirect } from "next/navigation";

/**
 * Catch-all for PR sub-paths like /changes, /files, /commits, /checks.
 * GitHub uses these as separate tabs — we show everything on the PR detail page,
 * so redirect back to it.
 */
export default async function PRSubPage({
	params,
}: {
	params: Promise<{ owner: string; repo: string; number: string }>;
}) {
	const { owner, repo, number } = await params;
	redirect(`/${owner}/${repo}/pulls/${number}`);
}
