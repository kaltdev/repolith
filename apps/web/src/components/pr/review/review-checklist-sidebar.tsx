"use client";

import Link from "next/link";
import { useEffect, useOptimistic, useState, useTransition } from "react";
import { AlertTriangle, Check, Link2, ListChecks, Loader2, Lock } from "lucide-react";
import { setPRReviewChecklistItemStateAction } from "@/app/(app)/repos/[owner]/[repo]/pulls/review-workspace-actions";
import { TimeAgo } from "@/components/ui/time-ago";
import type { PRReviewChecklistItemState } from "@/lib/pr-review-types";
import { cn } from "@/lib/utils";
import { applyPRReviewChecklistToggleAction } from "./review-workspace-ui";

interface ReviewChecklistSidebarProps {
	owner: string;
	repo: string;
	pullNumber: number;
	items: PRReviewChecklistItemState[];
	canPersist: boolean;
}

function buildEvidenceHref(owner: string, repo: string, pullNumber: number, path: string): string {
	const params = new URLSearchParams({
		file: path,
		tab: "review",
	});
	return `/repos/${owner}/${repo}/pulls/${pullNumber}?${params.toString()}`;
}

export function ReviewChecklistSidebar({
	owner,
	repo,
	pullNumber,
	items,
	canPersist,
}: ReviewChecklistSidebarProps) {
	const [persistedItems, setPersistedItems] = useState(items);
	const [pendingItemKey, setPendingItemKey] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [isPending, startTransition] = useTransition();
	const [optimisticItems, setOptimisticItems] = useOptimistic(
		persistedItems,
		applyPRReviewChecklistToggleAction,
	);

	useEffect(() => {
		setPersistedItems(items);
		setPendingItemKey(null);
		setError(null);
	}, [items]);

	const completedCount = optimisticItems.filter((item) => item.checked).length;
	const staleCount = optimisticItems.filter((item) => item.isStaleState).length;
	const completionRatio =
		optimisticItems.length > 0 ? (completedCount / optimisticItems.length) * 100 : 0;

	const handleToggle = (item: PRReviewChecklistItemState) => {
		if (!canPersist || pendingItemKey) return;

		const nextChecked = !item.checked;
		const updatedAt = new Date().toISOString();

		setError(null);
		setPendingItemKey(item.key);
		startTransition(async () => {
			setOptimisticItems({
				itemKey: item.key,
				checked: nextChecked,
				persisted: true,
				isStaleState: false,
				updatedAt,
			});

			try {
				const result = await setPRReviewChecklistItemStateAction({
					owner,
					repo,
					pullNumber,
					itemKey: item.key,
					itemFingerprint: item.fingerprint,
					checked: nextChecked,
				});

				if ("success" in result && result.success) {
					setPersistedItems((currentItems) =>
						applyPRReviewChecklistToggleAction(currentItems, {
							itemKey: item.key,
							checked: nextChecked,
							persisted: true,
							isStaleState: false,
							updatedAt,
						}),
					);
					return;
				}

				setError(
					"error" in result
						? result.error
						: "Failed to update checklist state",
				);
			} finally {
				setPendingItemKey(null);
			}
		});
	};

	return (
		<div className="flex h-full min-h-0 flex-col">
			<div className="shrink-0 border-b border-border/40 px-4 py-3">
				<div className="flex items-start gap-3">
					<div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-md border border-border/50 bg-muted/30">
						<ListChecks className="h-4 w-4 text-foreground/70" />
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center gap-2">
							<h2 className="text-sm font-medium text-foreground">
								Review Checklist
							</h2>
							{optimisticItems.length > 0 && (
								<span className="rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-mono text-muted-foreground">
									{completedCount}/
									{optimisticItems.length}
								</span>
							)}
						</div>
						<p className="mt-1 text-xs text-muted-foreground/80">
							Generated from changed files and stored per
							reviewer.
						</p>
					</div>
				</div>
				{optimisticItems.length > 0 && (
					<div className="mt-3">
						<div className="h-1.5 overflow-hidden rounded-full bg-border/30">
							<div
								className="h-full rounded-full bg-success/70 transition-all duration-300"
								style={{
									width: `${completionRatio}%`,
								}}
							/>
						</div>
						<div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-mono text-muted-foreground/70">
							<span>{completedCount} completed</span>
							{staleCount > 0 && (
								<span>
									{staleCount} reset after
									diff changes
								</span>
							)}
						</div>
					</div>
				)}
				{!canPersist && (
					<div className="mt-3 flex items-start gap-2 rounded-md border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground/80">
						<Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
						<span>
							Sign in to save checklist progress for this
							pull request.
						</span>
					</div>
				)}
				{error && (
					<div
						className="mt-3 flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive/90"
						role="status"
						aria-live="polite"
					>
						<AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
						<span>{error}</span>
					</div>
				)}
			</div>

			<div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
				{optimisticItems.length === 0 ? (
					<div className="rounded-lg border border-dashed border-border/60 bg-muted/10 px-4 py-5">
						<p className="text-sm font-medium text-foreground">
							No checklist items detected
						</p>
						<p className="mt-1 text-xs text-muted-foreground/80">
							This diff does not currently trigger tests,
							docs, breaking-change, or config review
							prompts.
						</p>
					</div>
				) : (
					<div className="space-y-3 pb-8">
						{optimisticItems.map((item) => {
							const isItemPending =
								pendingItemKey === item.key;

							return (
								<section
									key={item.key}
									className={cn(
										"rounded-lg border px-4 py-3 transition-colors",
										item.checked
											? "border-success/30 bg-success/5"
											: "border-border/50 bg-card/40",
									)}
								>
									<div className="flex items-start gap-3">
										<button
											type="button"
											role="checkbox"
											aria-checked={
												item.checked
											}
											disabled={
												!canPersist ||
												!!pendingItemKey
											}
											onClick={() =>
												handleToggle(
													item,
												)
											}
											className={cn(
												"mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
												item.checked
													? "border-success bg-success text-background"
													: "border-muted-foreground/30 bg-background text-transparent hover:border-muted-foreground/60",
												(!canPersist ||
													!!pendingItemKey) &&
													"cursor-not-allowed opacity-60",
											)}
											title={
												canPersist
													? item.checked
														? "Uncheck item"
														: "Check item"
													: "Sign in to persist checklist state"
											}
										>
											{isItemPending ? (
												<Loader2 className="h-3 w-3 animate-spin" />
											) : (
												<Check className="h-3 w-3" />
											)}
										</button>
										<div className="min-w-0 flex-1">
											<div className="flex flex-wrap items-center gap-2">
												<h3 className="text-sm font-medium text-foreground">
													{
														item.label
													}
												</h3>
												{item.isStaleState && (
													<span className="rounded-full border border-warning/30 bg-warning/10 px-2 py-0.5 text-[10px] font-mono text-warning">
														Reset
													</span>
												)}
												{item.updatedAt &&
													!item.isStaleState && (
														<span className="text-[10px] font-mono text-muted-foreground/60">
															<TimeAgo
																date={
																	item.updatedAt
																}
															/>
														</span>
													)}
											</div>
											<p className="mt-1 text-xs leading-5 text-muted-foreground/85">
												{
													item.reason
												}
											</p>
											{item
												.evidence
												.length >
												0 && (
												<div className="mt-3 flex flex-wrap gap-2">
													{item.evidence.map(
														(
															evidence,
														) => (
															<Link
																key={`${item.key}-${evidence.path}-${evidence.detail ?? "file"}`}
																href={buildEvidenceHref(
																	owner,
																	repo,
																	pullNumber,
																	evidence.path,
																)}
																className="inline-flex max-w-full items-center gap-1 rounded-full border border-border/50 bg-muted/20 px-2 py-1 text-[10px] font-mono text-muted-foreground transition-colors hover:border-border hover:text-foreground"
															>
																<Link2 className="h-3 w-3 shrink-0" />
																<span className="truncate">
																	{
																		evidence.path
																	}
																</span>
																{evidence.detail && (
																	<span className="truncate text-muted-foreground/60">
																		{
																			evidence.detail
																		}
																	</span>
																)}
															</Link>
														),
													)}
												</div>
											)}
										</div>
									</div>
								</section>
							);
						})}
					</div>
				)}
			</div>

			<div className="sr-only" aria-live="polite">
				{isPending ? "Saving checklist update" : "Checklist up to date"}
			</div>
		</div>
	);
}
