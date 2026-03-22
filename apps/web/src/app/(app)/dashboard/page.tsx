import { waitUntil } from "@vercel/functions";
import type { Metadata } from "next";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
	getUserRepos,
	searchIssues,
	getNotifications,
	getUserEvents,
	getTrendingRepos,
	warmRepoPageDataBatch,
} from "@/lib/github";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import type { GitHubUser, IssueItem, SearchResult } from "@/lib/github-types";
import { all } from "better-all";

export const metadata: Metadata = {
	title: "Dashboard",
};

const EMPTY_SEARCH_RESULT = {
	items: [],
	total_count: 0,
	incomplete_results: false,
} satisfies SearchResult<IssueItem> & { incomplete_results: boolean };

function getViewerLogin(githubUser: { login?: unknown }): string | null {
	const login = typeof githubUser.login === "string" ? githubUser.login.trim() : "";
	return login || null;
}

function normalizeDashboardUser(
	githubUser: Record<string, unknown>,
	sessionUser: { name?: string | null; image?: string | null },
	viewerLogin: string | null,
): GitHubUser {
	return {
		login: viewerLogin ?? "",
		avatar_url:
			typeof githubUser.avatar_url === "string"
				? githubUser.avatar_url
				: (sessionUser.image ?? ""),
		name:
			typeof githubUser.name === "string" || githubUser.name === null
				? githubUser.name
				: (sessionUser.name ?? null),
		public_repos:
			typeof githubUser.public_repos === "number" ? githubUser.public_repos : 0,
		followers: typeof githubUser.followers === "number" ? githubUser.followers : 0,
		following: typeof githubUser.following === "number" ? githubUser.following : 0,
	};
}

export default async function DashboardPage() {
	const session = await getServerSession();
	if (!session) return redirect("/");
	const { githubUser } = session;
	const viewerLogin = getViewerLogin(githubUser);
	const dashboardUser = normalizeDashboardUser(githubUser, session.user, viewerLogin);
	const { reviewRequests, myOpenPRs, myIssues, repos, notifications, activity, trending } =
		await all({
			reviewRequests: async () =>
				viewerLogin
					? await searchIssues(
							`is:pr is:open review-requested:${viewerLogin}`,
							10,
						)
					: EMPTY_SEARCH_RESULT,
			myOpenPRs: async () =>
				viewerLogin
					? await searchIssues(
							`is:pr is:open author:${viewerLogin}`,
							10,
						)
					: EMPTY_SEARCH_RESULT,
			myIssues: async () =>
				viewerLogin
					? await searchIssues(
							`is:issue is:open assignee:${viewerLogin}`,
							10,
						)
					: EMPTY_SEARCH_RESULT,
			repos: async () => await getUserRepos("updated", 30),
			notifications: async () => await getNotifications(20),
			activity: async () =>
				viewerLogin ? await getUserEvents(viewerLogin, 20) : [],
			trending: async () => await getTrendingRepos(undefined, "weekly", 8),
		});

	waitUntil(warmRepoPageDataBatch(repos.map((repo) => repo.full_name)));

	return (
		<DashboardContent
			user={dashboardUser}
			reviewRequests={reviewRequests}
			myOpenPRs={myOpenPRs}
			myIssues={myIssues}
			repos={repos}
			notifications={notifications}
			activity={activity}
			trending={trending}
		/>
	);
}
