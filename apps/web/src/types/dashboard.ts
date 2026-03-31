// Shared dashboard types and constants used across personal, team, and saved-search features.
export const DASHBOARD_WIDGET_IDS = [
	"review-requests",
	"my-pull-requests",
	"my-issues",
	"activity-feed",
	"trending-repositories",
	"saved-searches",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export const DEFAULT_DASHBOARD_WIDGET_ORDER: DashboardWidgetId[] = [
	"review-requests",
	"my-pull-requests",
	"my-issues",
	"activity-feed",
	"trending-repositories",
	"saved-searches",
];

export function getDashboardPullRequestKey(owner: string, repo: string, number: number) {
	return `${owner}/${repo}#${number}`;
}

export interface DashboardPullRequestMetadata {
	headSha: string;
	baseSha: string;
	mergeable: boolean | null;
	draft: boolean;
	state: string;
}

export type DashboardPullRequestMetadataMap = Record<string, DashboardPullRequestMetadata>;

export const ACTIVITY_EVENT_TYPES = [
	"push",
	"pull_request",
	"issue",
	"review",
	"comment",
	"release",
	"fork",
	"star",
] as const;

export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

export const ACTIVITY_RANGE_PRESETS = ["today", "7d", "30d", "custom"] as const;

export type ActivityRangePreset = (typeof ACTIVITY_RANGE_PRESETS)[number];

export interface ActivityFilters {
	eventTypes: ActivityEventType[];
	repo: string;
	range: ActivityRangePreset;
	from: string;
	to: string;
}

export const SAVED_SEARCH_SCOPES = ["issues", "prs", "repos", "users"] as const;

export type SavedSearchScope = (typeof SAVED_SEARCH_SCOPES)[number];

export interface SavedSearchApiRecord {
	id: string;
	label: string;
	query: string;
	scope: SavedSearchScope;
	lastUsedAt: string;
}

export interface SavedSearchRecord extends SavedSearchApiRecord {
	syncPending: boolean;
}

export interface TeamDashboardSelection {
	org: string;
	team: string;
}

export interface TeamDashboardMetrics {
	prsOpened: number;
	prsMerged: number;
	prsClosed: number;
	issuesOpened: number;
	issuesClosed: number;
	avgPrReviewTurnaroundHours: number;
	activeContributors: number;
}

export interface TeamOrgOption {
	login: string;
	name: string | null;
	avatarUrl: string;
}

export interface TeamActivityItem {
	id: string;
	type: string | null;
	repo: { name: string };
	created_at: string | null;
	actorLogin: string;
	actorAvatarUrl: string;
	payload: {
		action?: string;
		ref?: string | null;
		ref_type?: string;
		commits?: Array<{ message: string; sha: string }>;
		pull_request?: {
			number?: number;
			title?: string;
			html_url?: string;
			state?: string;
			draft?: boolean;
			merged?: boolean;
			merged_at?: string | null;
		};
		issue?: {
			number?: number;
			title?: string;
			html_url?: string;
			state?: string;
		};
		comment?: { html_url?: string };
		size?: number;
		release?: { tag_name?: string; name?: string };
	};
}

export interface TeamOpenPullRequestItem {
	id: number;
	title: string;
	number: number;
	repoFullName: string;
	updatedAt: string;
	createdAt: string;
	comments: number;
}

export interface TeamContributorItem {
	login: string;
	avatarUrl: string;
	commits: number;
	reviews: number;
	comments: number;
	score: number;
}

export interface TeamDashboardData {
	orgs: TeamOrgOption[];
	selectedOrg: string;
	selectedTeam: string;
	activity: TeamActivityItem[];
	openPrs: TeamOpenPullRequestItem[];
	metrics: TeamDashboardMetrics | null;
	contributors: TeamContributorItem[];
}
