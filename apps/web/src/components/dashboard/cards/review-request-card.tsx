"use client";

// Renders a dashboard review-request card and enables inline review submission when PR metadata is available.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Eye, GitPullRequest, MessageSquare } from "lucide-react";
import {
	savePRReviewWorkspaceDraftAction,
	submitPRReviewWorkspaceAction,
} from "@/app/(app)/repos/[owner]/[repo]/pulls/review-workspace-actions";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TimeAgo } from "@/components/ui/time-ago";
import { useQuickAction } from "@/hooks/use-quick-action";
import type { PRReviewPendingVerdict } from "@/lib/pr-review-types";
import { cn } from "@/lib/utils";
import type { IssueItem } from "@/lib/github-types";
import type { DashboardPullRequestMetadata } from "@/types/dashboard";
import { QuickActionBar } from "./quick-action-bar";

function extractRepoName(repoUrl: string) {
	const parts = repoUrl.split("/");
	return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
}

function buildPullPaths(item: IssueItem) {
	const repo = extractRepoName(item.repository_url);
	const basePath = `/${repo}/pulls/${item.number}`;
	return {
		repo,
		pullPath: basePath,
		filesPath: `${basePath}/files`,
	};
}

function getReviewDisabledReason(metadata: DashboardPullRequestMetadata | null) {
	if (!metadata) {
		return "Review workspace metadata is still loading for this pull request.";
	}
	if (metadata.state !== "open") {
		return "Closed pull requests cannot be reviewed.";
	}
	if (metadata.draft) {
		return "Draft pull requests must be marked ready before they can be reviewed.";
	}
	if (!metadata.headSha || !metadata.baseSha) {
		return "Review workspace data is unavailable for this pull request.";
	}
	return null;
}

export function ReviewRequestCard({
	item,
	metadata,
}: {
	item: IssueItem;
	metadata: DashboardPullRequestMetadata | null;
}) {
	const router = useRouter();
	const [reviewStatus, setReviewStatus] = useState<PRReviewPendingVerdict | null>(null);
	const [error, setError] = useState<string | null>(null);
	const { repo, pullPath, filesPath } = buildPullPaths(item);
	const isMerged = Boolean(item.pull_request?.merged_at);
	const isDraft = Boolean(item.draft);
	const disabledReviewReason = useMemo(() => getReviewDisabledReason(metadata), [metadata]);
	const canReviewInline = disabledReviewReason == null && reviewStatus == null;

	const reviewMutation = useQuickAction({
		queryKey: ["dashboard", "review-request", repo, item.number],
		mutationFn: async (verdict: PRReviewPendingVerdict) => {
			if (!metadata) {
				throw new Error("Review metadata is unavailable");
			}

			const saveResult = await savePRReviewWorkspaceDraftAction({
				owner: repo.split("/")[0],
				repo: repo.split("/")[1],
				pullNumber: item.number,
				headSha: metadata.headSha,
				baseSha: metadata.baseSha,
				draftBody: "",
				pendingVerdict: verdict,
			});

			if (!("success" in saveResult && saveResult.success)) {
				throw new Error(
					"error" in saveResult
						? saveResult.error
						: "Failed to save review draft",
				);
			}

			const submitResult = await submitPRReviewWorkspaceAction(
				repo.split("/")[0],
				repo.split("/")[1],
				item.number,
			);

			if (!("success" in submitResult && submitResult.success)) {
				throw new Error(
					"error" in submitResult
						? submitResult.error
						: "Failed to submit review",
				);
			}

			return verdict;
		},
		successEvent: () => ({
			type: "pr:reviewed",
			owner: repo.split("/")[0],
			repo: repo.split("/")[1],
			number: item.number,
		}),
	});

	const handleReview = async (verdict: PRReviewPendingVerdict) => {
		if (!canReviewInline || reviewMutation.isPending) return;

		setError(null);
		setReviewStatus(verdict);

		try {
			await reviewMutation.mutateAsync(verdict);
			router.refresh();
		} catch (nextError) {
			setReviewStatus(null);
			setError(
				nextError instanceof Error
					? nextError.message
					: "Failed to submit review",
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
						isMerged
							? "text-alert-important"
							: isDraft
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

			{reviewStatus ? (
				<p className="border-t border-border px-3 py-2 text-xs text-success">
					{reviewStatus === "APPROVE"
						? "Approved."
						: "Changes requested."}
				</p>
			) : null}
			{error ? (
				<p className="border-t border-border px-3 py-2 text-xs text-destructive">
					{error}
				</p>
			) : null}

			<QuickActionBar
				ariaLabel={`Quick actions for review request ${item.title}`}
			>
				<Button asChild size="sm" variant="outline">
					<Link href={pullPath}>
						<Eye className="h-3.5 w-3.5" />
						Start Review
					</Link>
				</Button>
				<Button asChild size="sm" variant="outline">
					<Link href={filesPath}>View Files</Link>
				</Button>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<span>
								<Button
									type="button"
									size="sm"
									disabled={
										!canReviewInline ||
										reviewMutation.isPending
									}
									onClick={() =>
										void handleReview(
											"APPROVE",
										)
									}
								>
									Approve
								</Button>
							</span>
						</TooltipTrigger>
						{disabledReviewReason ? (
							<TooltipContent>
								{disabledReviewReason}
							</TooltipContent>
						) : null}
					</Tooltip>
				</TooltipProvider>
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<span>
								<Button
									type="button"
									size="sm"
									variant="outline"
									disabled={
										!canReviewInline ||
										reviewMutation.isPending
									}
									onClick={() =>
										void handleReview(
											"REQUEST_CHANGES",
										)
									}
								>
									Request Changes
								</Button>
							</span>
						</TooltipTrigger>
						{disabledReviewReason ? (
							<TooltipContent>
								{disabledReviewReason}
							</TooltipContent>
						) : null}
					</Tooltip>
				</TooltipProvider>
			</QuickActionBar>
		</div>
	);
}
