"use client";

import { useState } from "react";
import Link from "next/link";
import { GithubAvatar } from "@/components/shared/github-avatar";
import { Check, AlertTriangle, MessageSquare, X as XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReviewThread } from "@/lib/github";
import { ReviewThreadList, type ReviewThreadFileGroup } from "./review/review-thread-list";
import type { PRReviewSummary } from "./review/review-models";

interface PRReviewsPanelProps {
	reviews: PRReviewSummary[];
	threads: ReviewThread[];
	owner: string;
	repo: string;
	pullNumber: number;
}

type FilterMode = "all" | "unresolved" | "resolved";

const stateConfig: Record<string, { icon: typeof Check; label: string; className: string }> = {
	APPROVED: {
		icon: Check,
		label: "Approved",
		className: "text-success",
	},
	CHANGES_REQUESTED: {
		icon: AlertTriangle,
		label: "Changes requested",
		className: "text-warning",
	},
	COMMENTED: {
		icon: MessageSquare,
		label: "Commented",
		className: "text-info",
	},
	DISMISSED: {
		icon: XIcon,
		label: "Dismissed",
		className: "text-muted-foreground",
	},
};

export function PRReviewsPanel({ reviews, threads, owner, repo, pullNumber }: PRReviewsPanelProps) {
	const [filter, setFilter] = useState<FilterMode>("all");
	const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

	// Deduplicate reviews: latest per user
	const latestByUser = new Map<string, PRReviewSummary>();
	for (const r of reviews) {
		if (!r.user || r.state === "PENDING") continue;
		const existing = latestByUser.get(r.user.login);
		if (
			!existing ||
			new Date(r.submitted_at || "").getTime() >
				new Date(existing.submitted_at || "").getTime()
		) {
			latestByUser.set(r.user.login, r);
		}
	}
	const reviewSummaries = Array.from(latestByUser.values());

	// Filter threads
	const filteredThreads = threads.filter((t) => {
		if (filter === "unresolved") return !t.isResolved;
		if (filter === "resolved") return t.isResolved;
		return true;
	});

	const threadGroups: ReviewThreadFileGroup[] = Array.from(
		filteredThreads.reduce((groups, thread) => {
			const existing = groups.get(thread.path) || [];
			existing.push(thread);
			groups.set(thread.path, existing);
			return groups;
		}, new Map<string, ReviewThread[]>()),
	)
		.sort(([left], [right]) => left.localeCompare(right))
		.map(([filePath, fileThreads]) => ({
			filePath,
			threads: fileThreads,
		}));

	const unresolvedCount = threads.filter((t) => !t.isResolved).length;
	const resolvedCount = threads.filter((t) => t.isResolved).length;

	const isFileExpanded = (path: string) => {
		if (expandedFiles.size === 0 && filter !== "resolved") return true;
		return expandedFiles.has(path);
	};

	const toggleFile = (path: string) => {
		setExpandedFiles((prev) => {
			const next = new Set(prev);
			if (prev.size === 0) {
				threadGroups.forEach((group) => next.add(group.filePath));
				next.delete(path);
			} else if (next.has(path)) {
				next.delete(path);
			} else {
				next.add(path);
			}
			return next;
		});
	};

	return (
		<div className="flex flex-col h-full">
			{/* Review summary */}
			{reviewSummaries.length > 0 && (
				<div className="shrink-0 px-4 py-3 border-b border-border/60">
					<div className="flex flex-wrap items-center gap-3">
						{reviewSummaries.map((r) => {
							const config =
								stateConfig[r.state] ||
								stateConfig.COMMENTED;
							const Icon = config.icon;
							return (
								<Link
									key={r.user!.login}
									href={`/users/${r.user!.login}`}
									className="flex items-center gap-1.5 hover:text-foreground transition-colors"
								>
									<GithubAvatar
										src={
											r.user!
												.avatar_url
										}
										alt={r.user!.login}
										className="rounded-full"
										size={18}
									/>
									<span className="text-xs font-medium text-foreground/80">
										{r.user!.login}
									</span>
									<Icon
										className={cn(
											"w-3.5 h-3.5",
											config.className,
										)}
									/>
								</Link>
							);
						})}
					</div>
				</div>
			)}

			{/* Filter bar */}
			<div className="shrink-0 px-4 py-2 border-b border-border/60 bg-card/30">
				<div className="flex items-center gap-1">
					{(
						[
							{
								key: "all",
								label: `All (${threads.length})`,
							},
							{
								key: "unresolved",
								label: `Unresolved (${unresolvedCount})`,
							},
							{
								key: "resolved",
								label: `Resolved (${resolvedCount})`,
							},
						] as const
					).map(({ key, label }) => (
						<button
							key={key}
							onClick={() => setFilter(key)}
							className={cn(
								"px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer",
								filter === key
									? "bg-accent text-foreground font-medium"
									: "text-muted-foreground hover:text-foreground hover:bg-muted/60",
							)}
						>
							{label}
						</button>
					))}
				</div>
			</div>

			{/* Threads by file */}
			<div className="flex-1 overflow-y-auto">
				{threadGroups.length === 0 && (
					<div className="py-12 text-center">
						<p className="text-sm text-muted-foreground/60">
							{filter === "unresolved"
								? "All threads resolved"
								: filter === "resolved"
									? "No resolved threads"
									: "No review threads yet"}
						</p>
					</div>
				)}
				<ReviewThreadList
					groups={threadGroups}
					variant="panel"
					isFileExpanded={isFileExpanded}
					onToggleFile={toggleFile}
					owner={owner}
					repo={repo}
					pullNumber={pullNumber}
				/>
			</div>
		</div>
	);
}
