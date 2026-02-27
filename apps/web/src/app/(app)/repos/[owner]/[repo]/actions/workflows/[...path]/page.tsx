import { redirect } from "next/navigation";

/**
 * GitHub-style /actions/workflows/<filename> URLs.
 * Redirect to our actions page with the workflow filename as a query param.
 */
export default async function WorkflowFilePage({
	params,
	searchParams,
}: {
	params: Promise<{ owner: string; repo: string; path: string[] }>;
	searchParams: Promise<Record<string, string | undefined>>;
}) {
	const { owner, repo, path } = await params;
	const sp = await searchParams;
	const workflowFile = path.join("/");
	const query = new URLSearchParams();
	if (workflowFile) query.set("workflow", workflowFile);
	if (sp.query) query.set("query", sp.query);
	if (sp.page) query.set("page", sp.page);
	const qs = query.toString();
	redirect(`/${owner}/${repo}/actions${qs ? `?${qs}` : ""}`);
}
