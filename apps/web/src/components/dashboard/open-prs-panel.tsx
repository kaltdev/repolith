"use client";

// Renders org pull requests that have likely been waiting on review.

import Link from "next/link";
import { GitPullRequest, MessageSquare } from "lucide-react";
import { TimeAgo } from "@/components/ui/time-ago";
import type { TeamOpenPullRequestItem } from "@/types/dashboard";

export function OpenPRsPanel({ items }: { items: TeamOpenPullRequestItem[] }) {
	return (
		<section className="rounded-md border border-border">
			<div className="border-b border-border px-4 py-2">
				<h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
					Open PRs Needing Review
				</h2>
			</div>
			<div>
				{items.length > 0 ? (
					items.map((item) => (
						<Link
							key={item.id}
							href={`/${item.repoFullName}/pulls/${item.number}`}
							className="flex items-center gap-3 border-b border-border/60 px-4 py-2.5 transition-colors hover:bg-muted/50 last:border-b-0"
						>
							<GitPullRequest className="h-3.5 w-3.5 shrink-0 text-success" />
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm">
									{item.title}
								</p>
								<div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/60">
									<span className="font-mono">
										{item.repoFullName}#
										{item.number}
									</span>
									<span>
										Updated{" "}
										<TimeAgo
											date={
												item.updatedAt
											}
										/>
									</span>
									{item.comments > 0 ? (
										<span className="inline-flex items-center gap-1">
											<MessageSquare className="h-3 w-3" />
											{
												item.comments
											}
										</span>
									) : null}
								</div>
							</div>
						</Link>
					))
				) : (
					<div className="px-4 py-10 text-center text-sm text-muted-foreground">
						No open PRs currently match the review queue.
					</div>
				)}
			</div>
		</section>
	);
}
