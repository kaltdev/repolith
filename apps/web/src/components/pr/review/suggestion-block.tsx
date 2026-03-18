"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, CheckCircle2, Code2, Loader2 } from "lucide-react";
import { ClientMarkdown } from "@/components/shared/client-markdown";
import { useMutationEvents } from "@/components/shared/mutation-event-provider";
import { commitSuggestion } from "@/app/(app)/repos/[owner]/[repo]/pulls/pr-actions";
import { applyPRReviewSuggestionAction } from "@/app/(app)/repos/[owner]/[repo]/pulls/review-workspace-actions";
import type { PRReviewSuggestion } from "@/lib/pr-review-types";
import { cn } from "@/lib/utils";

interface SuggestionBlockProps {
	commentId: number | string;
	before?: string;
	suggestion: string;
	after?: string;
	owner?: string;
	repo?: string;
	pullNumber?: number;
	headBranch?: string;
	filename: string;
	line: number | null;
	startLine?: number | null;
	canWrite?: boolean;
	draftSuggestion?: PRReviewSuggestion | null;
}

export function SuggestionBlock({
	commentId,
	before,
	suggestion,
	after,
	owner,
	repo,
	pullNumber,
	headBranch,
	filename,
	line,
	startLine,
	canWrite = true,
	draftSuggestion,
}: SuggestionBlockProps) {
	const router = useRouter();
	const { emit } = useMutationEvents();
	const [isPending, startTransition] = useTransition();
	const [result, setResult] = useState<{
		type: "success" | "error";
		msg: string;
	} | null>(null);
	const [commitMessage, setCommitMessage] = useState(`Apply suggestion to ${filename}`);
	const storageKey = `committed_suggestion_${String(commentId)}`;
	const [alreadyCommitted, setAlreadyCommitted] = useState(
		draftSuggestion?.status === "applied",
	);

	useEffect(() => {
		if (draftSuggestion) {
			setAlreadyCommitted(draftSuggestion.status === "applied");
			return;
		}

		try {
			if (sessionStorage.getItem(storageKey) === "1") {
				setAlreadyCommitted(true);
			}
		} catch {}
	}, [draftSuggestion, storageKey]);

	const canApplyPublishedSuggestion = !!(
		owner &&
		repo &&
		pullNumber &&
		headBranch &&
		line !== null &&
		!alreadyCommitted
	);
	const canApplyDraftSuggestion = !!(
		draftSuggestion &&
		!alreadyCommitted &&
		draftSuggestion.status !== "stale" &&
		draftSuggestion.status !== "disabled" &&
		!draftSuggestion.applyDisabledReason
	);
	const canApply = canWrite && (canApplyDraftSuggestion || canApplyPublishedSuggestion);
	const applyDisabledReason =
		draftSuggestion?.applyDisabledReason ??
		(!canWrite ? "You do not have permission to apply this suggestion." : null);

	const preview = useMemo(() => {
		if (!draftSuggestion?.originalCode) {
			return null;
		}

		return {
			before: draftSuggestion.originalCode,
			after: draftSuggestion.suggestedCode,
		};
	}, [draftSuggestion]);

	const handleApplySuggestion = () => {
		if (!canApply) return;
		const suggestionStartLine = startLine ?? line;
		if (!draftSuggestion && (suggestionStartLine === null || line === null)) return;

		setResult(null);
		startTransition(async () => {
			const response = draftSuggestion
				? await applyPRReviewSuggestionAction(
						draftSuggestion.id,
						commitMessage,
					)
				: await commitSuggestion(
						owner!,
						repo!,
						pullNumber!,
						filename,
						headBranch!,
						suggestionStartLine!,
						line!,
						suggestion,
						commitMessage,
					);

			if ("error" in response) {
				setResult({
					type: "error",
					msg: response.error ?? "Failed to apply suggestion",
				});
				return;
			}

			setResult({ type: "success", msg: "Applied" });
			setAlreadyCommitted(true);

			if (!draftSuggestion) {
				try {
					sessionStorage.setItem(storageKey, "1");
				} catch {}
			}

			await new Promise((resolve) => setTimeout(resolve, 500));
			if (owner && repo && pullNumber) {
				emit({
					type: "pr:suggestion-committed",
					owner,
					repo,
					number: pullNumber,
				});
			}
			router.refresh();
		});
	};

	return (
		<div>
			{before && (
				<div className="px-3 py-2 text-sm text-foreground/70">
					<ClientMarkdown content={before} />
				</div>
			)}

			<div className="border-y border-border/40">
				<div className="flex items-center gap-1.5 px-3 py-1 bg-muted/40">
					<Code2 className="h-3 w-3 text-muted-foreground/50" />
					<span className="text-[10px] font-mono text-muted-foreground/60">
						Suggested change
					</span>
				</div>

				{preview ? (
					<div className="grid border-t border-border/40 md:grid-cols-2">
						<div className="border-b border-border/40 bg-destructive/[0.04] md:border-b-0 md:border-r">
							<div className="px-3 py-1 text-[10px] font-mono text-destructive/70">
								Current
							</div>
							<pre className="overflow-x-auto px-3 py-2 text-[12.5px] font-mono leading-[20px] text-diff-del-text">
								{preview.before}
							</pre>
						</div>
						<div className="bg-success/[0.04]">
							<div className="px-3 py-1 text-[10px] font-mono text-success">
								Suggestion
							</div>
							<pre className="overflow-x-auto px-3 py-2 text-[12.5px] font-mono leading-[20px] text-diff-add-text">
								{preview.after}
							</pre>
						</div>
					</div>
				) : (
					<pre className="overflow-x-auto bg-success/[0.04] px-3 py-2 text-[12.5px] font-mono leading-[20px] text-diff-add-text">
						{suggestion}
					</pre>
				)}

				{alreadyCommitted || result?.type === "success" ? (
					<div className="flex items-center gap-1.5 bg-success/[0.06] px-3 py-1.5">
						<CheckCircle2 className="h-3 w-3 text-success" />
						<span className="text-[10px] font-mono text-success">
							Suggestion applied
						</span>
						{isPending && (
							<Loader2 className="ml-auto h-3 w-3 animate-spin text-muted-foreground/50" />
						)}
					</div>
				) : (
					<div className="flex flex-wrap items-center gap-2 bg-muted/40 px-3 py-1.5">
						{result?.type === "error" && (
							<span className="text-[10px] font-mono text-destructive">
								{result.msg}
							</span>
						)}
						{applyDisabledReason && !canApply && (
							<span className="text-[10px] font-mono text-warning">
								{applyDisabledReason}
							</span>
						)}
						{canApply && (
							<>
								<input
									type="text"
									value={commitMessage}
									onChange={(event) =>
										setCommitMessage(
											event.target
												.value,
										)
									}
									disabled={isPending}
									className={cn(
										"min-w-[12rem] flex-1 rounded-md border border-border bg-transparent px-2 py-1 text-[10px] font-mono",
										"text-foreground/70 placeholder:text-muted-foreground",
										"focus:outline-none focus:ring-1 focus:ring-foreground/20",
										"disabled:cursor-not-allowed disabled:opacity-40",
									)}
								/>
								<button
									onClick={
										handleApplySuggestion
									}
									disabled={isPending}
									className={cn(
										"flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider",
										"text-foreground/70 transition-colors hover:bg-muted/60 hover:text-foreground",
										"cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
									)}
								>
									{isPending ? (
										<Loader2 className="h-3 w-3 animate-spin" />
									) : (
										<Check className="h-3 w-3" />
									)}
									Apply suggestion
								</button>
							</>
						)}
					</div>
				)}
			</div>

			{after && (
				<div className="px-3 py-2 text-sm text-foreground/70">
					<ClientMarkdown content={after} />
				</div>
			)}
		</div>
	);
}
