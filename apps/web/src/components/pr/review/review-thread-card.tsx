"use client";

import { useState, useTransition, type MouseEvent } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, Circle, Loader2 } from "lucide-react";
import { GithubAvatar } from "@/components/shared/github-avatar";
import { ClientMarkdown } from "@/components/shared/client-markdown";
import { TimeAgo } from "@/components/ui/time-ago";
import {
	resolveReviewThread,
	unresolveReviewThread,
} from "@/app/(app)/repos/[owner]/[repo]/pulls/pr-actions";
import type { ReviewThread } from "@/lib/github";
import { cn } from "@/lib/utils";

interface ReviewThreadCardProps {
	thread: ReviewThread;
	variant: "panel" | "sidebar";
	owner?: string;
	repo?: string;
	pullNumber?: number;
	onNavigate?: () => void;
	onThreadMutated?: (thread: ReviewThread, resolved: boolean) => void;
}

export function ReviewThreadCard({
	thread,
	variant,
	owner,
	repo,
	pullNumber,
	onNavigate,
	onThreadMutated,
}: ReviewThreadCardProps) {
	const [expanded, setExpanded] = useState(false);
	const [isPending, startTransition] = useTransition();
	const firstComment = thread.comments[0];
	const replies = thread.comments.slice(1);

	const handleToggleResolve = (event: MouseEvent) => {
		event.stopPropagation();
		if (!owner || !repo || !pullNumber) return;

		startTransition(async () => {
			const nextResolved = !thread.isResolved;
			if (thread.isResolved) {
				await unresolveReviewThread(thread.id, owner, repo, pullNumber);
			} else {
				await resolveReviewThread(thread.id, owner, repo, pullNumber);
			}
			onThreadMutated?.(thread, nextResolved);
		});
	};

	if (variant === "sidebar") {
		return (
			<div
				onClick={onNavigate}
				className={cn(
					"rounded-md border text-left transition-colors cursor-pointer hover:bg-muted/50",
					thread.isResolved
						? "border-border/40 opacity-50"
						: "border-border",
				)}
			>
				<div className="flex items-center gap-1 px-2 py-1">
					{thread.isResolved ? (
						<CheckCircle2 className="w-3 h-3 shrink-0 text-success/60" />
					) : (
						<Circle className="w-3 h-3 shrink-0 text-warning/60" />
					)}
					{firstComment?.author && (
						<span className="text-[10px] font-medium text-foreground/60 truncate">
							{firstComment.author.login}
						</span>
					)}
					{thread.line && (
						<span className="text-[9px] font-mono text-muted-foreground ml-auto shrink-0">
							L{thread.line}
						</span>
					)}
				</div>

				<div className="px-2 pb-1.5">
					<p className="text-[10px] text-muted-foreground/70 line-clamp-2 whitespace-pre-wrap break-words">
						{firstComment?.body || ""}
					</p>
					{thread.comments.length > 1 && (
						<span className="text-[9px] text-muted-foreground/50 mt-0.5 block">
							+{thread.comments.length - 1} more
						</span>
					)}
				</div>

				{owner && repo && pullNumber && (
					<div className="px-2 pb-1.5">
						<button
							onClick={handleToggleResolve}
							disabled={isPending}
							className={cn(
								"text-[9px] font-mono transition-colors cursor-pointer disabled:opacity-40",
								thread.isResolved
									? "text-muted-foreground/50 hover:text-warning"
									: "text-muted-foreground/50 hover:text-success",
							)}
						>
							{thread.isResolved
								? "Unresolve"
								: "Resolve"}
						</button>
					</div>
				)}
			</div>
		);
	}

	return (
		<div
			className={cn(
				"rounded-lg border transition-colors",
				thread.isResolved
					? "border-border/40 bg-card/30"
					: "border-border/60",
			)}
		>
			<button
				onClick={() => setExpanded((value) => !value)}
				className="w-full text-left cursor-pointer group/thread"
			>
				<div className="flex items-center gap-2 px-3 pt-2 pb-1">
					<ChevronDown
						className={cn(
							"w-3 h-3 text-muted-foreground/50 transition-transform duration-200 shrink-0",
							!expanded && "-rotate-90",
						)}
					/>
					{firstComment?.author && (
						<Link
							href={`/users/${firstComment.author.login}`}
							onClick={(event) => event.stopPropagation()}
							className="flex items-center gap-2 text-xs font-medium text-foreground/80 hover:text-foreground transition-colors"
						>
							<GithubAvatar
								src={firstComment.author.avatarUrl}
								alt={firstComment.author.login}
								className="rounded-full shrink-0"
								size={16}
							/>
							{firstComment.author.login}
						</Link>
					)}
					{thread.line !== null && (
						<span className="text-[10px] text-muted-foreground/50 font-mono shrink-0">
							L{thread.line}
						</span>
					)}
					{firstComment && (
						<span className="text-[10px] text-muted-foreground/50 shrink-0">
							<TimeAgo date={firstComment.createdAt} />
						</span>
					)}
					{replies.length > 0 && (
						<span className="text-[10px] text-muted-foreground/50 shrink-0">
							+{replies.length}
						</span>
					)}

					<span className="ml-auto shrink-0">
						<span
							onClick={handleToggleResolve}
							className={cn(
								"inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-md transition-colors cursor-pointer",
								isPending &&
									"opacity-40 pointer-events-none",
								thread.isResolved
									? "text-success hover:bg-success/10"
									: "text-muted-foreground hover:text-foreground hover:bg-muted/60",
							)}
						>
							{isPending ? (
								<Loader2 className="w-3 h-3 animate-spin" />
							) : thread.isResolved ? (
								<CheckCircle2 className="w-3 h-3" />
							) : (
								<Circle className="w-3 h-3" />
							)}
							{thread.isResolved ? "Resolved" : "Resolve"}
						</span>
					</span>
				</div>

				{!expanded && firstComment && (
					<div className="relative px-3 pb-2 pl-[2.25rem]">
						<div className="max-h-[3.5rem] overflow-hidden">
							<div
								className={cn(
									"text-[13px] leading-[1.4] text-foreground/70",
									thread.isResolved &&
										"opacity-50",
								)}
							>
								<ClientMarkdown
									content={firstComment.body}
								/>
							</div>
						</div>
						<div className="absolute bottom-2 left-[2.25rem] right-3 h-6 bg-gradient-to-t from-background to-transparent pointer-events-none" />
					</div>
				)}
			</button>

			{expanded && (
				<div className="border-t border-border/40">
					{thread.comments.map((comment, index) => (
						<div
							key={comment.id}
							className={cn(
								index > 0 &&
									"border-t border-border/30",
							)}
						>
							<div className="flex items-center gap-1.5 px-3 py-1.5">
								{comment.author && (
									<Link
										href={`/users/${comment.author.login}`}
										className="flex items-center gap-1.5 text-xs font-medium text-foreground/80 hover:text-foreground transition-colors"
									>
										<GithubAvatar
											src={
												comment
													.author
													.avatarUrl
											}
											alt={
												comment
													.author
													.login
											}
											size={14}
											className="rounded-full shrink-0"
										/>
										{
											comment
												.author
												.login
										}
									</Link>
								)}
								<span className="text-[10px] text-muted-foreground/50">
									<TimeAgo
										date={
											comment.createdAt
										}
									/>
								</span>
							</div>
							<div
								className={cn(
									"px-3 pb-2.5 text-[13px] leading-[1.5] text-foreground/80",
									thread.isResolved &&
										"opacity-60",
								)}
							>
								<ClientMarkdown
									content={comment.body}
								/>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
