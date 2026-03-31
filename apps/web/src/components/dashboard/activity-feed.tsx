"use client";

// Renders the filterable activity feed widget content for the personal dashboard.

import Link from "next/link";
import {
	ChevronRight,
	CircleDot,
	GitCommit,
	GitFork,
	GitPullRequest,
	MessageCircle,
	Plus,
	Star,
	Trash2,
	Eye,
} from "lucide-react";
import { useMemo } from "react";
import { ActivityFilterBar } from "./activity-filter-bar";
import { useActivityFilters, filterActivityEvents } from "@/hooks/use-activity-filters";
import { TimeAgo } from "@/components/ui/time-ago";
import type { ActivityEvent } from "@/lib/github-types";

function getEventSummary(event: ActivityEvent): {
	icon: React.ReactNode;
	href: string;
	text: string;
} {
	const repo = event.repo.name;
	const repoHref = `/${repo}`;
	const payload = event.payload;

	switch (event.type) {
		case "PushEvent": {
			const message = payload.commits?.[0]?.message?.split("\n")[0];
			const count = payload.size ?? payload.commits?.length ?? 0;
			return {
				icon: <GitCommit className="size-3" />,
				href: repoHref,
				text:
					message ||
					(count > 1
						? `Pushed ${count} commits to ${repo}`
						: `Pushed to ${repo}`),
			};
		}
		case "PullRequestEvent": {
			const pr = payload.pull_request;
			if (!pr?.number) {
				return {
					icon: <GitPullRequest className="size-3" />,
					href: repoHref,
					text: `PR activity in ${repo}`,
				};
			}
			const action =
				payload.action === "closed" && pr.merged
					? "merged"
					: payload.action || "updated";
			return {
				icon: <GitPullRequest className="size-3" />,
				href: `${repoHref}/pulls/${pr.number}`,
				text: `${action} #${pr.number}${pr.title ? `: ${pr.title}` : ""}`,
			};
		}
		case "PullRequestReviewEvent": {
			const pr = payload.pull_request;
			return {
				icon: <Eye className="size-3" />,
				href: pr?.number ? `${repoHref}/pulls/${pr.number}` : repoHref,
				text: pr?.number
					? `Reviewed #${pr.number}${pr.title ? `: ${pr.title}` : ""}`
					: `Reviewed PR in ${repo}`,
			};
		}
		case "PullRequestReviewCommentEvent": {
			const pr = payload.pull_request;
			return {
				icon: <MessageCircle className="size-3" />,
				href: pr?.number ? `${repoHref}/pulls/${pr.number}` : repoHref,
				text: pr?.number
					? `Commented on review #${pr.number}${pr.title ? `: ${pr.title}` : ""}`
					: `Commented on PR in ${repo}`,
			};
		}
		case "IssuesEvent": {
			const issue = payload.issue;
			if (!issue?.number) {
				return {
					icon: <CircleDot className="size-3" />,
					href: repoHref,
					text: `Issue activity in ${repo}`,
				};
			}
			const action = payload.action || "updated";
			return {
				icon: <CircleDot className="size-3" />,
				href: `${repoHref}/issues/${issue.number}`,
				text: `${action} #${issue.number}${issue.title ? `: ${issue.title}` : ""}`,
			};
		}
		case "IssueCommentEvent": {
			const issue = payload.issue;
			return {
				icon: <MessageCircle className="size-3" />,
				href: issue?.number
					? `${repoHref}/issues/${issue.number}`
					: repoHref,
				text: issue?.number
					? `Commented on #${issue.number}${issue.title ? `: ${issue.title}` : ""}`
					: `Commented in ${repo}`,
			};
		}
		case "ReleaseEvent":
			return {
				icon: <Plus className="size-3" />,
				href: repoHref,
				text: `${payload.action || "published"} release ${payload.release?.tag_name || ""} in ${repo}`.trim(),
			};
		case "ForkEvent":
			return {
				icon: <GitFork className="size-3" />,
				href: repoHref,
				text: `Forked ${repo}`,
			};
		case "WatchEvent":
			return {
				icon: <Star className="size-3" />,
				href: repoHref,
				text: `Starred ${repo}`,
			};
		case "DeleteEvent":
			return {
				icon: <Trash2 className="size-3" />,
				href: repoHref,
				text: `Deleted ${payload.ref_type || "ref"} ${payload.ref || ""}`.trim(),
			};
		case "CommitCommentEvent":
			return {
				icon: <MessageCircle className="size-3" />,
				href: repoHref,
				text: `Commented on a commit in ${repo}`,
			};
		default:
			return {
				icon: <CircleDot className="size-3" />,
				href: repoHref,
				text: `${event.type || "Activity"} in ${repo}`,
			};
	}
}

function getEventTypeLabel(event: ActivityEvent): string {
	switch (event.type) {
		case "PushEvent":
			return "Push";
		case "PullRequestEvent":
			return "Pull request";
		case "PullRequestReviewEvent":
			return "Review";
		case "PullRequestReviewCommentEvent":
		case "IssueCommentEvent":
		case "CommitCommentEvent":
			return "Comment";
		case "IssuesEvent":
			return "Issue";
		case "ReleaseEvent":
			return "Release";
		case "ForkEvent":
			return "Fork";
		case "WatchEvent":
			return "Star";
		default:
			return "Activity";
	}
}

function ActivityEmptyState({ message }: { message: string }) {
	return (
		<div className="flex min-h-40 items-center justify-center px-4 py-10 text-center">
			<div>
				<p className="text-sm font-medium text-foreground">{message}</p>
				<p className="mt-1 text-xs text-muted-foreground">
					Try widening the selected filters.
				</p>
			</div>
		</div>
	);
}

export function ActivityFeed({
	activity,
	sectionId,
}: {
	activity: ActivityEvent[];
	sectionId?: string;
}) {
	const {
		filters,
		activeChips,
		hasActiveFilters,
		toggleEventType,
		setRepo,
		setRange,
		setCustomRange,
		clearChip,
		clearAll,
	} = useActivityFilters();

	const repoOptions = useMemo(() => {
		const repos = new Set<string>();
		for (const event of activity) {
			if (event.repo.name) {
				repos.add(event.repo.name);
			}
		}
		return [...repos].sort((a, b) => a.localeCompare(b));
	}, [activity]);

	const filteredActivity = useMemo(
		() => filterActivityEvents(activity, filters),
		[activity, filters],
	);

	return (
		<div id={sectionId} className="space-y-0">
			<ActivityFilterBar
				filters={filters}
				repoOptions={repoOptions}
				activeChips={activeChips}
				hasActiveFilters={hasActiveFilters}
				onToggleEventType={toggleEventType}
				onRepoChange={setRepo}
				onRangeChange={setRange}
				onCustomRangeChange={setCustomRange}
				onRemoveChip={clearChip}
				onClearAll={clearAll}
			/>
			{filteredActivity.length === 0 ? (
				<ActivityEmptyState
					message={
						hasActiveFilters
							? "No activity matched these filters."
							: "No recent activity."
					}
				/>
			) : (
				<div className="divide-y divide-border/60">
					{filteredActivity.map((event) => {
						const summary = getEventSummary(event);
						const repo = event.repo.name;
						return (
							<Link
								key={event.id}
								href={summary.href}
								className="group flex items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted/50 dark:hover:bg-white/2"
							>
								<span className="mt-0.5 shrink-0 text-muted-foreground/70">
									{summary.icon}
								</span>
								<div className="min-w-0 flex-1">
									<div className="truncate group-hover:text-foreground">
										{summary.text}
									</div>
									<div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-mono text-muted-foreground/60">
										<span>{repo}</span>
										<span className="inline-flex items-center gap-1">
											<span className="size-1.5 rounded-full bg-muted-foreground/50" />
											{getEventTypeLabel(
												event,
											)}
										</span>
										{event.created_at ? (
											<span>
												<TimeAgo
													date={
														event.created_at
													}
												/>
											</span>
										) : null}
									</div>
								</div>
								<ChevronRight className="size-3 shrink-0 text-muted-foreground/30 opacity-0 transition-opacity group-hover:opacity-100" />
							</Link>
						);
					})}
				</div>
			)}
		</div>
	);
}
