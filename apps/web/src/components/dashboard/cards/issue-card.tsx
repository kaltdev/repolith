"use client";

// Renders a dashboard issue card with close and inline comment actions.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { CircleDot, MessageSquare } from "lucide-react";
import { addIssueComment, closeIssue } from "@/app/(app)/repos/[owner]/[repo]/issues/issue-actions";
import { Button } from "@/components/ui/button";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";
import { TimeAgo } from "@/components/ui/time-ago";
import { useQuickAction } from "@/hooks/use-quick-action";
import type { IssueItem } from "@/lib/github-types";
import { InlineCommentComposer } from "./inline-comment-composer";
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
		issuePath: `/${repo}/issues/${item.number}`,
	};
}

export function IssueCard({ item }: { item: IssueItem }) {
	const router = useRouter();
	const [hidden, setHidden] = useState(false);
	const [composerOpen, setComposerOpen] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);
	const [commentBody, setCommentBody] = useState("");
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);
	const { owner, repo, repoName, number, issuePath } = useMemo(
		() => getOwnerRepoNumber(item),
		[item],
	);

	const commentMutation = useQuickAction({
		queryKey: ["dashboard", "issue", owner, repoName, number],
		mutationFn: async (body: string) => {
			const result = await addIssueComment(owner, repoName, number, body);
			if ("error" in result && result.error) {
				throw new Error(result.error);
			}
			return result;
		},
		successEvent: { type: "issue:commented", owner, repo: repoName, number },
	});

	const closeMutation = useQuickAction({
		queryKey: ["dashboard", "issue", owner, repoName, number],
		mutationFn: async () => {
			const result = await closeIssue(owner, repoName, number, "completed");
			if ("error" in result && result.error) {
				throw new Error(result.error);
			}
			return result;
		},
		successEvent: { type: "issue:closed", owner, repo: repoName, number },
	});

	if (hidden) return null;

	const handleClose = async () => {
		setError(null);
		setSuccess(null);
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
					: "Failed to close issue",
			);
		}
	};

	const handleCommentSubmit = async () => {
		if (!commentBody.trim()) return;
		setError(null);
		setSuccess(null);
		try {
			await commentMutation.mutateAsync(commentBody.trim());
			setCommentBody("");
			setComposerOpen(false);
			setSuccess("Comment added.");
			router.refresh();
		} catch (nextError) {
			setError(
				nextError instanceof Error
					? nextError.message
					: "Failed to add comment",
			);
		}
	};

	return (
		<div className="group rounded-md border border-border bg-background">
			<Link
				href={issuePath}
				className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/50 dark:hover:bg-white/2"
			>
				<CircleDot className="h-3.5 w-3.5 shrink-0 text-success" />
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

			{success ? (
				<p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
					{success}
				</p>
			) : null}
			{error ? (
				<p className="border-t border-border px-3 py-2 text-xs text-destructive">
					{error}
				</p>
			) : null}

			<QuickActionBar ariaLabel={`Quick actions for issue ${item.title}`}>
				<Button asChild size="sm" variant="outline">
					<Link href={issuePath}>View Issue</Link>
				</Button>
				<Popover open={confirmOpen} onOpenChange={setConfirmOpen}>
					<PopoverTrigger asChild>
						<Button
							type="button"
							size="sm"
							variant="outline"
							disabled={closeMutation.isPending}
						>
							Close Issue
						</Button>
					</PopoverTrigger>
					<PopoverContent align="end">
						<PopoverHeader>
							<PopoverTitle>Close issue?</PopoverTitle>
							<PopoverDescription>
								This removes the issue from your
								dashboard immediately.
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
				<Button
					type="button"
					size="sm"
					variant="outline"
					onClick={() => setComposerOpen((current) => !current)}
				>
					Add Comment
				</Button>
			</QuickActionBar>

			{composerOpen ? (
				<div className="border-t border-border px-3 py-3">
					<InlineCommentComposer
						value={commentBody}
						onChange={setCommentBody}
						onSubmit={() => void handleCommentSubmit()}
						onCancel={() => {
							setComposerOpen(false);
							setCommentBody("");
						}}
						submitting={commentMutation.isPending}
						submitLabel="Submit"
						cancelLabel="Cancel"
						ariaLabel={`Add comment to ${item.title}`}
					/>
				</div>
			) : null}
		</div>
	);
}
