"use client";

// Renders a dashboard pull-request card and enables merge when the dashboard has mergeability metadata.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { GitPullRequest, MessageSquare } from "lucide-react";
import {
	closePullRequest,
	mergePullRequest,
} from "@/app/(app)/repos/[owner]/[repo]/pulls/pr-actions";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TimeAgo } from "@/components/ui/time-ago";
import { useQuickAction } from "@/hooks/use-quick-action";
import { cn } from "@/lib/utils";
import type { IssueItem } from "@/lib/github-types";
import type { DashboardPullRequestMetadata } from "@/types/dashboard";
import { QuickActionBar } from "./quick-action-bar";

function extractRepoName(repoUrl: string) {
	const parts = repoUrl.split("/");
	return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

function getOwnerRepoNumber(item: IssueItem) {
	const repo = extractRepoName(item.repository_url);
	const [owner, repoName] = repo.split("/");
	return {
		repo,
		owner,
		repoName,
		number: item.number,
		pullPath: `/${repo}/pulls/${item.number}`,
	};
}

function getMergeDisabledReason(metadata: DashboardPullRequestMetadata | null) {
	if (!metadata) {
		return "Mergeability metadata is still loading for this pull request.";
	}
	if (metadata.state !== "open") {
		return "Closed pull requests cannot be merged from the dashboard.";
	}
	if (metadata.draft) {
		return "Draft pull requests must be marked ready before they can be merged.";
	}
	if (metadata.mergeable === null) {
		return "GitHub is still calculating mergeability for this pull request.";
	}
	if (metadata.mergeable === false) {
		return "GitHub reports merge conflicts or failing checks for this pull request.";
	}
	return null;
}

export function PullRequestCard({
	item,
	metadata,
}: {
	item: IssueItem;
	metadata: DashboardPullRequestMetadata | null;
}) {
	const router = useRouter();
	const [hidden, setHidden] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const { owner, repo, repoName, number, pullPath } = useMemo(
		() => getOwnerRepoNumber(item),
		[item],
	);
	const mergeDisabledReason = useMemo(() => getMergeDisabledReason(metadata), [metadata]);
	const canMergeInline = mergeDisabledReason == null;

	const mergeMutation = useQuickAction({
		queryKey: ["dashboard", "pull-request", owner, repoName, number],
		mutationFn: async () => {
			const result = await mergePullRequest(owner, repoName, number, "merge");
			if ("error" in result && result.error) {
				throw new Error(result.error);
			}
			return result;
		},
		successEvent: { type: "pr:merged", owner, repo: repoName, number },
	});

	const closeMutation = useQuickAction({
		queryKey: ["dashboard", "pull-request", owner, repoName, number],
		mutationFn: async () => {
			const result = await closePullRequest(owner, repoName, number);
			if ("error" in result && result.error) {
				throw new Error(result.error);
			}
			return result;
		},
		successEvent: { type: "pr:closed", owner, repo: repoName, number },
	});

	if (hidden) return null;

	const handleClose = async () => {
		setError(null);
		setConfirmOpen(false);
		setHidden(true);
		try {
			await closeMutation.mutateAsync(undefined);
			router.refresh();
		} catch (nextError) {
			setHidden(false);
			setError(
				nextError instanceof Error
					? nextError.message
					: "Failed to close pull request",
			);
		}
	};

	const handleMerge = async () => {
		if (!canMergeInline) return;
		setError(null);
		setHidden(true);
		try {
			await mergeMutation.mutateAsync(undefined);
			router.refresh();
		} catch (nextError) {
			setHidden(false);
			setError(
				nextError instanceof Error
					? nextError.message
					: "Failed to merge pull request",
			);
		}
	};

	return (
		<div className="group rounded-md border border-border bg-background">
			<Link
				href={pullPath}
				className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 dark:hover:bg-white/2"
			>
				<GitPullRequest
					className={cn(
						"h-3.5 w-3.5 shrink-0",
						item.draft
							? "text-muted-foreground"
							: "text-success",
					)}
				/>
				<div className="min-w-0 flex-1">
					<span className="block truncate text-sm group-hover:text-foreground">
						{item.title}
					</span>
					<div className="mt-px flex flex-wrap items-center gap-2 text-[11px]">
						<span className="font-mono text-muted-foreground/70">
							{repo}#{item.number}
						</span>
						<span className="text-muted-foreground/50">
							<TimeAgo date={item.updated_at} />
						</span>
						{item.comments > 0 ? (
							<span className="flex items-center gap-0.5 text-muted-foreground/50">
								<MessageSquare className="h-2.5 w-2.5" />
								{item.comments}
							</span>
						) : null}
					</div>
				</div>
			</Link>

			{error ? (
				<p className="border-t border-border px-3 py-2 text-xs text-destructive">
					{error}
				</p>
			) : null}

			<QuickActionBar ariaLabel={`Quick actions for pull request ${item.title}`}>
				<Button asChild size="sm" variant="outline">
					<Link href={pullPath}>View PR</Link>
				</Button>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<span>
								<Button
									type="button"
									size="sm"
									disabled={
										!canMergeInline ||
										mergeMutation.isPending
									}
									onClick={() =>
										void handleMerge()
									}
								>
									Merge
								</Button>
							</span>
						</TooltipTrigger>
						{mergeDisabledReason ? (
							<TooltipContent>
								{mergeDisabledReason}
							</TooltipContent>
						) : null}
					</Tooltip>
				</TooltipProvider>
				<Popover open={confirmOpen} onOpenChange={setConfirmOpen}>
					<PopoverTrigger asChild>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={closeMutation.isPending}
						>
							Close PR
						</Button>
					</PopoverTrigger>
					<PopoverContent align="end">
						<PopoverHeader>
							<PopoverTitle>
								Close pull request?
							</PopoverTitle>
							<PopoverDescription>
								This removes the pull request from
								your dashboard immediately.
							</PopoverDescription>
						</PopoverHeader>
						<div className="mt-3 flex justify-end gap-2">
							<Button
								type="button"
								size="sm"
								variant="outline"
								onClick={() =>
									setConfirmOpen(false)
								}
							>
								Cancel
							</Button>
							<Button
								type="button"
								size="sm"
								onClick={() => void handleClose()}
							>
								Confirm
							</Button>
						</div>
					</PopoverContent>
				</Popover>
			</QuickActionBar>
		</div>
	);
}
