"use client";

// Renders the org-scoped activity feed by reusing the existing activity filter bar.

import Link from "next/link";
import {
	ChevronRight,
	GitCommit,
	GitFork,
	GitPullRequest,
	MessageCircle,
	Star,
	CircleDot,
	Eye,
} from "lucide-react";
import { useMemo } from "react";
import { GithubAvatar } from "@/components/shared/github-avatar";
import { TimeAgo } from "@/components/ui/time-ago";
import { ActivityFilterBar } from "./activity-filter-bar";
import { useActivityFilters } from "@/hooks/use-activity-filters";
import { filterActivityEvents } from "@/hooks/use-activity-filters";
import type { TeamActivityItem } from "@/types/dashboard";

function getSummary(event: TeamActivityItem) {
	const repoHref = `/${event.repo.name}`;
	switch (event.type) {
		case "PushEvent":
			return {
				icon: <GitCommit className="size-3" />,
				href: repoHref,
				text:
					event.payload.commits?.[0]?.message?.split("\n")[0] ||
					`Pushed to ${event.repo.name}`,
			};
		case "PullRequestEvent":
			return {
				icon: <GitPullRequest className="size-3" />,
				href: event.payload.pull_request?.number
					? `${repoHref}/pulls/${event.payload.pull_request.number}`
					: repoHref,
				text: `${event.payload.action || "Updated"} PR${event.payload.pull_request?.number ? ` #${event.payload.pull_request.number}` : ""}`,
			};
		case "PullRequestReviewEvent":
			return {
				icon: <Eye className="size-3" />,
				href: event.payload.pull_request?.number
					? `${repoHref}/pulls/${event.payload.pull_request.number}`
					: repoHref,
				text: "Reviewed pull request",
			};
		case "IssueCommentEvent":
		case "PullRequestReviewCommentEvent":
		case "CommitCommentEvent":
			return {
				icon: <MessageCircle className="size-3" />,
				href: repoHref,
				text: "Commented on discussion",
			};
		case "IssuesEvent":
			return {
				icon: <CircleDot className="size-3" />,
				href: event.payload.issue?.number
					? `${repoHref}/issues/${event.payload.issue.number}`
					: repoHref,
				text: `${event.payload.action || "Updated"} issue`,
			};
		case "WatchEvent":
			return {
				icon: <Star className="size-3" />,
				href: repoHref,
				text: `Starred ${event.repo.name}`,
			};
		case "ForkEvent":
			return {
				icon: <GitFork className="size-3" />,
				href: repoHref,
				text: `Forked ${event.repo.name}`,
			};
		default:
			return {
				icon: <CircleDot className="size-3" />,
				href: repoHref,
				text: `${event.type || "Activity"} in ${event.repo.name}`,
			};
	}
}

export function TeamActivityFeed({ activity }: { activity: TeamActivityItem[] }) {
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

	const repoOptions = useMemo(
		() => [...new Set(activity.map((item) => item.repo.name).filter(Boolean))].sort(),
		[activity],
	);
	const filtered = useMemo(
		() => filterActivityEvents(activity as never, filters) as TeamActivityItem[],
		[activity, filters],
	);

	return (
		<section className="rounded-md border border-border">
			<div className="border-b border-border px-4 py-2">
				<h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
					Team Activity Feed
				</h2>
			</div>
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
			<div>
				{filtered.length > 0 ? (
					filtered.map((event) => {
						const summary = getSummary(event);
						return (
							<Link
								key={event.id}
								href={summary.href}
								className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 transition-colors hover:bg-muted/50 last:border-b-0"
							>
								<GithubAvatar
									src={event.actorAvatarUrl}
									alt={event.actorLogin}
									size={22}
									className="h-[22px] w-[22px] rounded-full"
								/>
								<span className="text-muted-foreground/70">
									{summary.icon}
								</span>
								<div className="min-w-0 flex-1">
									<p className="truncate text-sm">
										<span className="font-medium">
											{
												event.actorLogin
											}
										</span>{" "}
										{summary.text}
									</p>
									<div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/60">
										<span className="font-mono">
											{
												event
													.repo
													.name
											}
										</span>
										{event.created_at ? (
											<TimeAgo
												date={
													event.created_at
												}
											/>
										) : null}
									</div>
								</div>
								<ChevronRight className="size-3 shrink-0 text-muted-foreground/30" />
							</Link>
						);
					})
				) : (
					<div className="px-4 py-10 text-center text-sm text-muted-foreground">
						No team activity matched the current filters.
					</div>
				)}
			</div>
		</section>
	);
}
