"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { MessageSquarePlus, CircleOff, CheckCircle2, CircleDot, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useClickOutside } from "@/hooks/use-click-outside";
import { closeIssue, reopenIssue } from "@/app/(app)/repos/[owner]/[repo]/issues/issue-actions";
import { useMutationEvents } from "@/components/shared/mutation-event-provider";

type CloseReason = "completed" | "not_planned";

interface IssueSidebarActionsProps {
	owner: string;
	repo: string;
	issueNumber: number;
	issueState: string;
}

export function IssueSidebarActions({
	owner,
	repo,
	issueNumber,
	issueState,
}: IssueSidebarActionsProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [dropdownOpen, setDropdownOpen] = useState(false);
	const [selectedReason, setSelectedReason] = useState<CloseReason>("completed");
	const dropdownRef = useRef<HTMLDivElement>(null);
	const { emit } = useMutationEvents();
	const isOpen = issueState === "open";

	useClickOutside(dropdownRef, () => setDropdownOpen(false));

	const scrollToCommentForm = () => {
		const el = document.getElementById("issue-comment-form");
		if (el) {
			el.scrollIntoView({ behavior: "smooth", block: "center" });
			setTimeout(() => {
				const textarea = el.querySelector("textarea");
				textarea?.focus();
			}, 400);
		}
	};

	const handleClose = (reason: CloseReason) => {
		setDropdownOpen(false);
		startTransition(async () => {
			await closeIssue(owner, repo, issueNumber, reason);
			emit({ type: "issue:closed", owner, repo, number: issueNumber });
			router.refresh();
		});
	};

	const handleReopen = () => {
		startTransition(async () => {
			await reopenIssue(owner, repo, issueNumber);
			emit({ type: "issue:reopened", owner, repo, number: issueNumber });
			router.refresh();
		});
	};

	return (
		<div className="space-y-2">
			<button
				onClick={scrollToCommentForm}
				className={cn(
					"w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-md transition-colors cursor-pointer",
					"border border-border/60 hover:bg-muted/50 text-foreground/70 hover:text-foreground",
				)}
			>
				<MessageSquarePlus className="w-3.5 h-3.5" />
				Add comment
			</button>

			{isOpen ? (
				<div className="relative" ref={dropdownRef}>
					<div className="flex items-stretch border border-border/60 rounded-md overflow-hidden">
						<button
							onClick={() => handleClose(selectedReason)}
							disabled={isPending}
							className={cn(
								"flex-1 flex items-center gap-2 px-3 py-1.5 text-xs font-mono",
								"hover:bg-muted/50 text-foreground/70 hover:text-foreground",
								"transition-colors cursor-pointer",
								"disabled:opacity-50 disabled:cursor-not-allowed",
							)}
						>
							{isPending ? (
								<div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin shrink-0" />
							) : selectedReason === "completed" ? (
								<CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
							) : (
								<CircleOff className="w-3.5 h-3.5 shrink-0" />
							)}
							<span className="truncate">
								{selectedReason === "completed"
									? "Close as completed"
									: "Close as not planned"}
							</span>
						</button>
						<button
							onClick={() =>
								setDropdownOpen(!dropdownOpen)
							}
							disabled={isPending}
							className={cn(
								"flex items-center justify-center w-7 border-l border-border/60",
								"text-foreground/70 hover:text-foreground hover:bg-muted/50",
								"transition-colors cursor-pointer",
								"disabled:opacity-50 disabled:cursor-not-allowed",
							)}
						>
							<ChevronDown className="w-3 h-3" />
						</button>
					</div>

					{dropdownOpen && (
						<div className="absolute top-full left-0 right-0 mt-1 bg-background border border-border rounded-md shadow-lg z-30 overflow-hidden">
							<div className="px-3 py-1.5 border-b border-border">
								<span className="text-[10px] font-medium text-muted-foreground">
									Close reason
								</span>
							</div>
							<button
								onClick={() => {
									setSelectedReason(
										"completed",
									);
									setDropdownOpen(false);
								}}
								className={cn(
									"flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/60 transition-colors cursor-pointer",
									selectedReason ===
										"completed" &&
										"bg-muted/40",
								)}
							>
								<CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
								<div>
									<p className="text-[11px] font-medium">
										Completed
									</p>
									<p className="text-[9px] text-muted-foreground/70 leading-tight">
										Done, closed with
										resolution
									</p>
								</div>
							</button>
							<button
								onClick={() => {
									setSelectedReason(
										"not_planned",
									);
									setDropdownOpen(false);
								}}
								className={cn(
									"flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/60 transition-colors cursor-pointer",
									selectedReason ===
										"not_planned" &&
										"bg-muted/40",
								)}
							>
								<CircleOff className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
								<div>
									<p className="text-[11px] font-medium">
										Not planned
									</p>
									<p className="text-[9px] text-muted-foreground/70 leading-tight">
										Won&apos;t fix,
										duplicate, or stale
									</p>
								</div>
							</button>
						</div>
					)}
				</div>
			) : (
				<button
					onClick={handleReopen}
					disabled={isPending}
					className={cn(
						"w-full flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded-md transition-colors cursor-pointer",
						"border border-border/60",
						"hover:bg-success/10 text-success/70 hover:text-success border-success/20",
						isPending && "opacity-50 cursor-not-allowed",
					)}
				>
					{isPending ? (
						<div className="w-3.5 h-3.5 border border-current border-t-transparent rounded-full animate-spin" />
					) : (
						<CircleDot className="w-3.5 h-3.5" />
					)}
					Reopen issue
				</button>
			)}
		</div>
	);
}
