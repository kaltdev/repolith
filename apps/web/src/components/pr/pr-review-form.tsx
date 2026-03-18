"use client";

import { useState, useTransition, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, AlertTriangle, MessageSquare, Loader2, ChevronDown, Eye } from "lucide-react";
import { formatForDisplay } from "@tanstack/react-hotkeys";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/hooks/use-click-outside";
import {
	savePRReviewWorkspaceDraftAction,
	submitPRReviewWorkspaceAction,
} from "@/app/(app)/repos/[owner]/[repo]/pulls/review-workspace-actions";
import { MarkdownEditor } from "@/components/shared/markdown-editor";
import { useMutationEvents } from "@/components/shared/mutation-event-provider";
import type { PRReviewPendingVerdict, PRReviewWorkspacePageData } from "@/lib/pr-review-types";

interface PRReviewFormProps {
	owner: string;
	repo: string;
	pullNumber: number;
	headSha: string;
	baseSha: string;
	reviewWorkspaceData: PRReviewWorkspacePageData;
	canPersistReviewWorkspace: boolean;
	participants?: Array<{ login: string; avatar_url: string }>;
}

type DraftSaveState = "idle" | "saving" | "saved" | "error";

function isNewerDraftRevision(nextRevision: string | null, currentRevision: string | null) {
	if (!nextRevision) return false;
	if (!currentRevision) return true;
	return nextRevision > currentRevision;
}

const reviewOptions: {
	key: PRReviewPendingVerdict;
	label: string;
	desc: string;
	icon: typeof Check;
	accent: string;
}[] = [
	{
		key: "COMMENT",
		label: "Comment",
		desc: "General feedback without explicit approval.",
		icon: MessageSquare,
		accent: "text-foreground",
	},
	{
		key: "APPROVE",
		label: "Approve",
		desc: "Approve merging these changes.",
		icon: Check,
		accent: "text-success",
	},
	{
		key: "REQUEST_CHANGES",
		label: "Request changes",
		desc: "Changes must be addressed before merging.",
		icon: AlertTriangle,
		accent: "text-warning",
	},
];

function getDraftDescriptor(comment: PRReviewWorkspacePageData["draftComments"][number]): string {
	const line = comment.endLine ?? comment.startLine;
	if (comment.replyToCommentId != null) {
		return `${comment.path}${line ? `:${line}` : ""} reply`;
	}
	return `${comment.path}${line ? `:${line}` : ""}`;
}

export function PRReviewForm({
	owner,
	repo,
	pullNumber,
	headSha,
	baseSha,
	reviewWorkspaceData,
	canPersistReviewWorkspace,
	participants,
}: PRReviewFormProps) {
	const router = useRouter();
	const { emit } = useMutationEvents();
	const [open, setOpen] = useState(false);
	const serverBody = reviewWorkspaceData.workspace?.draftBody ?? "";
	const serverVerdict = reviewWorkspaceData.workspace?.pendingVerdict ?? "COMMENT";
	const [body, setBody] = useState(serverBody);
	const [selected, setSelected] = useState<PRReviewPendingVerdict>(serverVerdict);
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const [saveState, setSaveState] = useState<DraftSaveState>("idle");
	const [lastSavedBody, setLastSavedBody] = useState(serverBody);
	const [lastSavedVerdict, setLastSavedVerdict] =
		useState<PRReviewPendingVerdict>(serverVerdict);
	const panelRef = useRef<HTMLDivElement>(null);
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const localDraftVersionRef = useRef(0);
	const persistedDraftVersionRef = useRef(0);
	const latestSaveRequestIdRef = useRef(0);
	const latestServerRevisionRef = useRef<string | null>(
		reviewWorkspaceData.workspace?.updatedAt ?? null,
	);

	useClickOutside(
		panelRef,
		useCallback(() => setOpen(false), []),
	);

	useEffect(() => {
		const incomingRevision = reviewWorkspaceData.workspace?.updatedAt ?? null;
		if (!isNewerDraftRevision(incomingRevision, latestServerRevisionRef.current)) {
			return;
		}
		if (localDraftVersionRef.current > persistedDraftVersionRef.current) {
			return;
		}

		latestServerRevisionRef.current = incomingRevision;
		setBody(serverBody);
		setSelected(serverVerdict);
		setLastSavedBody(serverBody);
		setLastSavedVerdict(serverVerdict);
	}, [reviewWorkspaceData.workspace?.updatedAt, serverBody, serverVerdict]);

	const saveDraftState = useCallback(
		async (nextBody: string, nextVerdict: PRReviewPendingVerdict) => {
			if (!canPersistReviewWorkspace) {
				setSaveState("error");
				setError("Sign in to save private review drafts.");
				return false;
			}

			const requestId = latestSaveRequestIdRef.current + 1;
			const draftVersion = localDraftVersionRef.current;
			latestSaveRequestIdRef.current = requestId;
			setSaveState("saving");
			const result = await savePRReviewWorkspaceDraftAction({
				owner,
				repo,
				pullNumber,
				headSha,
				baseSha,
				draftBody: nextBody,
				pendingVerdict: nextVerdict,
			});

			if (requestId !== latestSaveRequestIdRef.current) {
				return false;
			}

			if ("success" in result && result.success) {
				persistedDraftVersionRef.current = Math.max(
					persistedDraftVersionRef.current,
					draftVersion,
				);
				latestServerRevisionRef.current = result.data.updatedAt;
				setLastSavedBody(nextBody);
				setLastSavedVerdict(nextVerdict);
				const hasNewerLocalChanges =
					localDraftVersionRef.current > draftVersion;
				setSaveState(hasNewerLocalChanges ? "saving" : "saved");
				return true;
			}

			setSaveState("error");
			setError("error" in result ? result.error : "Failed to save review draft");
			return false;
		},
		[baseSha, canPersistReviewWorkspace, headSha, owner, pullNumber, repo],
	);

	useEffect(() => {
		if (!canPersistReviewWorkspace) return;
		if (body === lastSavedBody && selected === lastSavedVerdict) return;

		if (saveTimerRef.current) {
			clearTimeout(saveTimerRef.current);
		}

		saveTimerRef.current = setTimeout(() => {
			void saveDraftState(body, selected);
		}, 350);

		return () => {
			if (saveTimerRef.current) {
				clearTimeout(saveTimerRef.current);
				saveTimerRef.current = null;
			}
		};
	}, [
		body,
		canPersistReviewWorkspace,
		lastSavedBody,
		lastSavedVerdict,
		saveDraftState,
		selected,
	]);

	useEffect(() => {
		return () => {
			if (saveTimerRef.current) {
				clearTimeout(saveTimerRef.current);
				saveTimerRef.current = null;
			}
		};
	}, []);

	const allDrafts = reviewWorkspaceData.draftComments;
	const stagedDrafts = allDrafts.filter((comment) => comment.status === "active");
	const topLevelDrafts = stagedDrafts.filter((comment) => comment.replyToCommentId == null);
	const replyDrafts = stagedDrafts.filter((comment) => comment.replyToCommentId != null);
	const staleDrafts = allDrafts.filter(
		(comment) =>
			comment.isStale ||
			comment.suggestions.some((suggestion) => suggestion.isStale),
	);

	const trimmedBody = body.trim();
	const canSubmit =
		selected === "APPROVE"
			? canPersistReviewWorkspace
			: canPersistReviewWorkspace &&
				(stagedDrafts.length > 0 || trimmedBody.length > 0);

	const handleSubmit = () => {
		if (!canSubmit) return;

		setError(null);
		startTransition(async () => {
			if (saveTimerRef.current) {
				clearTimeout(saveTimerRef.current);
				saveTimerRef.current = null;
			}

			const saved = await saveDraftState(body, selected);
			if (!saved) {
				return;
			}

			const result = await submitPRReviewWorkspaceAction(owner, repo, pullNumber);
			if (!("success" in result && result.success)) {
				setError(
					"error" in result
						? result.error
						: "Failed to submit review",
				);
				return;
			}

			setBody("");
			setSelected("COMMENT");
			setLastSavedBody("");
			setLastSavedVerdict("COMMENT");
			setSaveState("idle");
			setOpen(false);
			if (result.data.warning) {
				setError(result.data.warning);
			}
			emit({ type: "pr:reviewed", owner, repo, number: pullNumber });
			router.refresh();
		});
	};

	const statusText = (() => {
		if (!canPersistReviewWorkspace) {
			return "Sign in to save private review drafts.";
		}
		if (staleDrafts.length > 0) {
			return `${staleDrafts.length} draft item${staleDrafts.length === 1 ? "" : "s"} need to be refreshed before submission.`;
		}
		if (saveState === "saving") {
			return "Saving private draft...";
		}
		if (saveState === "saved") {
			return "Private draft saved.";
		}
		if (stagedDrafts.length > 0 || trimmedBody.length > 0) {
			return "Private draft review is ready to submit.";
		}
		return "Stage inline comments, then submit them in one review.";
	})();

	return (
		<div ref={panelRef} className="relative">
			<button
				onClick={() => setOpen((value) => !value)}
				className={cn(
					"flex items-center gap-1.5 px-3 py-1.5 text-xs",
					"border border-border rounded-sm",
					"text-foreground/80 hover:text-foreground hover:bg-muted",
					"transition-all cursor-pointer",
					open && "bg-muted",
				)}
			>
				<Eye className="w-3.5 h-3.5" />
				Review
				{stagedDrafts.length > 0 && (
					<span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-mono text-foreground">
						{stagedDrafts.length}
					</span>
				)}
				<ChevronDown
					className={cn(
						"w-3 h-3 text-muted-foreground/50 transition-transform",
						open && "rotate-180",
					)}
				/>
			</button>

			{open && (
				<div className="absolute top-full right-0 z-50 mt-1.5 w-[28rem] border border-border bg-background shadow-lg dark:shadow-2xl">
					<div className="border-b border-border/60 px-3 py-2">
						<div className="flex items-center justify-between gap-3">
							<div>
								<p className="text-xs font-medium text-foreground">
									Submit review
								</p>
								<p className="text-[11px] text-muted-foreground/60">
									{topLevelDrafts.length}{" "}
									comment
									{topLevelDrafts.length === 1
										? ""
										: "s"}
									{replyDrafts.length > 0
										? `, ${replyDrafts.length} repl${replyDrafts.length === 1 ? "y" : "ies"}`
										: ""}
								</p>
							</div>
							{staleDrafts.length > 0 && (
								<span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-mono text-warning">
									{staleDrafts.length} stale
								</span>
							)}
						</div>
					</div>

					<div className="p-3 pb-2">
						<MarkdownEditor
							value={body}
							onChange={(nextBody) => {
								localDraftVersionRef.current += 1;
								setBody(nextBody);
								setSaveState(
									canPersistReviewWorkspace
										? "saving"
										: "error",
								);
								setError(null);
							}}
							placeholder="Add summary feedback for this review"
							rows={4}
							autoFocus
							participants={participants}
							owner={owner}
							onKeyDown={(event) => {
								if (
									event.key === "Enter" &&
									(event.metaKey ||
										event.ctrlKey)
								) {
									event.preventDefault();
									handleSubmit();
								}
								if (event.key === "Escape") {
									setOpen(false);
								}
							}}
						/>
					</div>

					<div className="px-3 pb-2 space-y-px">
						{reviewOptions.map(
							({
								key,
								label,
								desc,
								icon: Icon,
								accent,
							}) => {
								const isSelected = selected === key;

								return (
									<button
										key={key}
										onClick={() => {
											localDraftVersionRef.current += 1;
											setSelected(
												key,
											);
											setSaveState(
												canPersistReviewWorkspace
													? "saving"
													: "error",
											);
											setError(
												null,
											);
										}}
										className={cn(
											"w-full flex items-start gap-2.5 rounded-sm px-2 py-2 text-left transition-colors cursor-pointer",
											isSelected
												? "bg-muted/60 dark:bg-white/[0.04]"
												: "hover:bg-muted/40 dark:hover:bg-white/[0.02]",
										)}
									>
										<div
											className={cn(
												"mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
												isSelected
													? "border-foreground/70"
													: "border-muted-foreground/30",
											)}
										>
											{isSelected && (
												<div className="h-2 w-2 rounded-full bg-foreground/80" />
											)}
										</div>

										<div className="min-w-0 flex-1">
											<div className="flex items-center gap-1.5">
												<Icon
													className={cn(
														"h-3.5 w-3.5",
														accent,
													)}
												/>
												<span
													className={cn(
														"text-xs font-medium",
														isSelected
															? "text-foreground"
															: "text-foreground/70",
													)}
												>
													{
														label
													}
												</span>
											</div>
											<p className="mt-0.5 text-[11px] leading-snug text-muted-foreground/50">
												{
													desc
												}
											</p>
										</div>
									</button>
								);
							},
						)}
					</div>

					{allDrafts.length > 0 && (
						<div className="border-t border-border/50 px-3 py-2">
							<div className="mb-1.5 flex items-center justify-between gap-2">
								<span className="text-[11px] font-medium text-foreground/80">
									Staged items
								</span>
								<span className="text-[10px] font-mono text-muted-foreground/60">
									{allDrafts.length}
								</span>
							</div>
							<div className="space-y-1">
								{allDrafts
									.slice(0, 5)
									.map((comment) => (
										<div
											key={
												comment.id
											}
											className="flex items-center gap-2 rounded-sm border border-border/60 px-2 py-1.5"
										>
											<span className="truncate text-[10px] font-mono text-foreground/80">
												{getDraftDescriptor(
													comment,
												)}
											</span>
											{comment.isStale && (
												<span className="ml-auto shrink-0 rounded-full bg-warning/10 px-1.5 py-0.5 text-[9px] font-mono text-warning">
													Stale
												</span>
											)}
											{comment.replyToCommentId !=
												null &&
												!comment.isStale && (
													<span className="ml-auto shrink-0 rounded-full bg-info/10 px-1.5 py-0.5 text-[9px] font-mono text-info">
														Reply
													</span>
												)}
										</div>
									))}
								{allDrafts.length > 5 && (
									<p className="text-[10px] text-muted-foreground/50">
										+
										{allDrafts.length -
											5}{" "}
										more staged items
									</p>
								)}
							</div>
						</div>
					)}

					<div className="px-3 pb-2">
						<p
							className={cn(
								"text-[11px]",
								saveState === "error" ||
									staleDrafts.length > 0
									? "text-warning"
									: "text-muted-foreground/60",
							)}
						>
							{statusText}
						</p>
						{error && (
							<p className="pt-1 text-[11px] text-destructive">
								{error}
							</p>
						)}
					</div>

					<div className="flex items-center justify-end gap-2 border-t border-border px-3 py-2.5">
						<button
							onClick={() => setOpen(false)}
							className="cursor-pointer rounded-sm border border-border px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground dark:hover:bg-white/3"
						>
							Close
						</button>
						<button
							onClick={handleSubmit}
							disabled={
								isPending ||
								saveState === "saving" ||
								!canSubmit
							}
							className={cn(
								"flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider",
								"bg-foreground text-background hover:bg-foreground/90",
								"transition-colors cursor-pointer",
								"disabled:opacity-40 disabled:cursor-not-allowed",
							)}
						>
							{isPending && (
								<Loader2 className="h-3 w-3 animate-spin" />
							)}
							Submit review
							{!isPending && (
								<kbd className="ml-0.5 hidden items-center gap-0.5 text-[10px] text-background/50 sm:inline-flex">
									<span>
										{formatForDisplay(
											"Mod+Enter",
										)}
									</span>
								</kbd>
							)}
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
