import { waitUntil } from "@vercel/functions";
import type { Metadata } from "next";
import { getServerSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
	getUserRepos,
	searchIssues,
	getNotifications,
	getUserEvents,
	getUserOrgs,
	getOrgMembers,
	getPullRequestBundle,
	getTrendingRepos,
	warmRepoPageDataBatch,
} from "@/lib/github";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import type { GitHubUser, IssueItem, SearchResult } from "@/lib/github-types";
import { all } from "better-all";
import type {
	DashboardPullRequestMetadata,
	DashboardPullRequestMetadataMap,
	TeamActivityItem,
	TeamContributorItem,
	TeamDashboardData,
	TeamDashboardMetrics,
	TeamOpenPullRequestItem,
	TeamOrgOption,
} from "@/types/dashboard";
import { getDashboardPullRequestKey } from "@/types/dashboard";

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

function isoDateDaysAgo(days: number) {
	const date = new Date();
	date.setUTCDate(date.getUTCDate() - days);
	return date.toISOString().slice(0, 10);
}

async function buildPullRequestMetadataMap(
	items: IssueItem[],
): Promise<DashboardPullRequestMetadataMap> {
	const entries = await Promise.all(
		items.map(async (item) => {
			const repoFullName = item.repository_url.split("/").slice(-2).join("/");
			const [owner, repo] = repoFullName.split("/");
			if (!owner || !repo) return null;

			const bundle = await getPullRequestBundle(owner, repo, item.number);
			if (!bundle) return null;

			return [
				getDashboardPullRequestKey(owner, repo, item.number),
				{
					headSha: bundle.pr.head.sha,
					baseSha: bundle.pr.base.sha,
					mergeable: bundle.pr.mergeable,
					draft: bundle.pr.draft,
					state: bundle.pr.state,
				},
			] as const;
		}),
	);

	return Object.fromEntries(
		entries.filter((entry): entry is readonly [string, DashboardPullRequestMetadata] =>
			Boolean(entry),
		),
	);
}

async function buildTeamDashboardData(
	selectedOrgParam: string | null,
): Promise<TeamDashboardData | null> {
	const orgs = await getUserOrgs(25);
	const orgOptions: TeamOrgOption[] = (orgs ?? [])
		.map((org: Record<string, unknown>) => ({
			login: String(org.login ?? ""),
			name: typeof org.name === "string" ? org.name : null,
			avatarUrl: String(org.avatar_url ?? ""),
		}))
		.filter((org) => org.login);

	if (orgOptions.length === 0) return null;

	const selectedOrg = orgOptions.some((org) => org.login === selectedOrgParam)
		? (selectedOrgParam as string)
		: orgOptions[0].login;

	const [orgMembers, openPrSearch, metricsSearches] = await Promise.all([
		getOrgMembers(selectedOrg, 12),
		searchIssues(`is:pr is:open org:${selectedOrg}`, 20),
		Promise.all([
			searchIssues(`is:pr org:${selectedOrg} created:>=${isoDateDaysAgo(7)}`, 1),
			searchIssues(`is:pr org:${selectedOrg} merged:>=${isoDateDaysAgo(7)}`, 1),
			searchIssues(
				`is:pr is:closed org:${selectedOrg} closed:>=${isoDateDaysAgo(7)}`,
				1,
			),
			searchIssues(
				`is:issue org:${selectedOrg} created:>=${isoDateDaysAgo(7)}`,
				1,
			),
			searchIssues(
				`is:issue is:closed org:${selectedOrg} closed:>=${isoDateDaysAgo(7)}`,
				1,
			),
		]),
	]);

	const memberList = Array.isArray(orgMembers) ? orgMembers.slice(0, 10) : [];
	const memberEvents = await Promise.all(
		memberList.map(async (member: { login?: string; avatar_url?: string }) => {
			const login = member.login ?? "";
			if (!login) return [];
			const events = await getUserEvents(login, 20);
			return (events ?? [])
				.filter((event: { repo?: { name?: string } }) =>
					event.repo?.name?.startsWith(`${selectedOrg}/`),
				)
				.map((event: Record<string, unknown>) => ({
					...(event as TeamActivityItem),
					actorLogin: login,
					actorAvatarUrl: member.avatar_url ?? "",
				})) as TeamActivityItem[];
		}),
	);

	const activity = memberEvents
		.flat()
		.sort((left, right) => {
			const leftTime = new Date(left.created_at ?? 0).getTime();
			const rightTime = new Date(right.created_at ?? 0).getTime();
			return rightTime - leftTime;
		})
		.slice(0, 50);

	const contributorMap = new Map<string, TeamContributorItem>();
	for (const event of activity) {
		const current = contributorMap.get(event.actorLogin) ?? {
			login: event.actorLogin,
			avatarUrl: event.actorAvatarUrl,
			commits: 0,
			reviews: 0,
			comments: 0,
			score: 0,
		};
		if (event.type === "PushEvent")
			current.commits += event.payload.size ?? event.payload.commits?.length ?? 1;
		if (event.type === "PullRequestReviewEvent") current.reviews += 1;
		if (
			event.type === "IssueCommentEvent" ||
			event.type === "PullRequestReviewCommentEvent" ||
			event.type === "CommitCommentEvent"
		)
			current.comments += 1;
		current.score = current.commits * 2 + current.reviews * 3 + current.comments;
		contributorMap.set(event.actorLogin, current);
	}

	const openPrs: TeamOpenPullRequestItem[] = (openPrSearch.items ?? [])
		.filter(
			(item) =>
				Date.now() - new Date(item.updated_at).getTime() >
				24 * 60 * 60 * 1000,
		)
		.slice(0, 12)
		.map((item) => ({
			id: item.id,
			title: item.title,
			number: item.number,
			repoFullName: item.repository_url.split("/").slice(-2).join("/"),
			updatedAt: item.updated_at,
			createdAt: item.created_at,
			comments: item.comments,
		}));

	const recentBundles = await Promise.all(
		openPrs.slice(0, 6).map(async (item) => {
			const [owner, repo] = item.repoFullName.split("/");
			return await getPullRequestBundle(owner, repo, item.number);
		}),
	);
	const reviewDurations = recentBundles
		.map((bundle) => {
			if (!bundle?.reviews.length) return null;
			const firstReview = bundle.reviews
				.filter((review) => review.submitted_at)
				.sort(
					(a, b) =>
						new Date(a.submitted_at ?? 0).getTime() -
						new Date(b.submitted_at ?? 0).getTime(),
				)[0];
			if (!firstReview?.submitted_at) return null;
			return (
				(new Date(firstReview.submitted_at).getTime() -
					new Date(bundle.pr.created_at).getTime()) /
				(1000 * 60 * 60)
			);
		})
		.filter((value): value is number => value !== null);

	const metrics: TeamDashboardMetrics = {
		prsOpened: metricsSearches[0].total_count,
		prsMerged: metricsSearches[1].total_count,
		prsClosed: metricsSearches[2].total_count,
		issuesOpened: metricsSearches[3].total_count,
		issuesClosed: metricsSearches[4].total_count,
		avgPrReviewTurnaroundHours:
			reviewDurations.length > 0
				? reviewDurations.reduce((sum, value) => sum + value, 0) /
					reviewDurations.length
				: 0,
		activeContributors: contributorMap.size,
	};

	return {
		orgs: orgOptions,
		selectedOrg,
		selectedTeam: "",
		activity,
		openPrs,
		metrics,
		contributors: [...contributorMap.values()]
			.sort((a, b) => b.score - a.score)
			.slice(0, 8),
	};
}

export default async function DashboardPage({
	searchParams,
}: {
	searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
	const session = await getServerSession();
	if (!session) return redirect("/");
	const resolvedSearchParams = searchParams ? await searchParams : {};
	const { githubUser } = session;
	const viewerLogin = getViewerLogin(githubUser);
	const dashboardUser = normalizeDashboardUser(githubUser, session.user, viewerLogin);
	const selectedOrgParam =
		typeof resolvedSearchParams.org === "string" ? resolvedSearchParams.org : null;
	const {
		reviewRequests,
		myOpenPRs,
		myIssues,
		repos,
		notifications,
		activity,
		trending,
		teamDashboard,
	} = await all({
		reviewRequests: async () =>
			viewerLogin
				? await searchIssues(
						`is:pr is:open review-requested:${viewerLogin}`,
						10,
					)
				: EMPTY_SEARCH_RESULT,
		myOpenPRs: async () =>
			viewerLogin
				? await searchIssues(`is:pr is:open author:${viewerLogin}`, 10)
				: EMPTY_SEARCH_RESULT,
		myIssues: async () =>
			viewerLogin
				? await searchIssues(`is:issue is:open assignee:${viewerLogin}`, 10)
				: EMPTY_SEARCH_RESULT,
		repos: async () => await getUserRepos("updated", 30),
		notifications: async () => await getNotifications(20),
		activity: async () => (viewerLogin ? await getUserEvents(viewerLogin, 20) : []),
		trending: async () => await getTrendingRepos(undefined, "weekly", 8),
		teamDashboard: async () => await buildTeamDashboardData(selectedOrgParam),
	});

	const [reviewRequestMetadata, myOpenPRMetadata] = await Promise.all([
		buildPullRequestMetadataMap(reviewRequests.items),
		buildPullRequestMetadataMap(myOpenPRs.items),
	]);

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
			teamDashboard={teamDashboard}
			reviewRequestMetadata={reviewRequestMetadata}
			myOpenPRMetadata={myOpenPRMetadata}
		/>
	);
}
