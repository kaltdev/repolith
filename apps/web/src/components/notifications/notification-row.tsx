"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, CircleDot, GitPullRequest } from "lucide-react";
import type { NotificationEnrichedItem, NotificationStatusKind } from "@/lib/github-types";
import { TimeAgo } from "@/components/ui/time-ago";
import { cn } from "@/lib/utils";

function NotificationTypeIcon({
	subjectType,
	className,
}: {
	subjectType: string;
	className?: string;
}) {
	if (subjectType === "PullRequest")
		return <GitPullRequest className={cn("h-3.5 w-3.5", className)} />;
	if (subjectType === "Issue") return <CircleDot className={cn("h-3.5 w-3.5", className)} />;
	return <Bell className={cn("h-3.5 w-3.5", className)} />;
}

function unreadIconAccent(
	statusKind: NotificationStatusKind,
	title: string,
	reason?: string,
): string {
	if (statusKind === "comment" || reason === "comment") {
		return "text-foreground/75";
	}
	if (statusKind === "failed" || statusKind === "security") {
		return "text-destructive";
	}
	if (statusKind === "passed") {
		return "text-success";
	}
	if (statusKind === "running" || statusKind === "review_requested") {
		return "text-warning";
	}
	if (statusKind === "state_change") {
		const lower = title.toLowerCase();
		if (lower.includes("closed")) return "text-destructive";
		if (lower.includes("merged")) return "text-alert-important";
		if (lower.includes("reopened")) return "text-success";
	}
	return "text-muted-foreground/75";
}

function buildSecondaryText(item: NotificationEnrichedItem): string {
	const target = item.entity.number ? `#${item.entity.number}` : "";
	const repo = item.repoFullName;
	const actor = item.actor?.login;

	if (item.reason === "ci_activity" && item.ci) {
		if (item.ci.failure > 0) {
			return `${item.ci.failure} failed check${item.ci.failure > 1 ? "s" : ""} on PR ${target} in ${repo}`;
		}
		if (item.ci.pending > 0) {
			return `${item.ci.pending} check${item.ci.pending > 1 ? "s" : ""} running on PR ${target} in ${repo}`;
		}
		return `All checks passed on PR ${target} in ${repo}`;
	}

	if (item.reason === "review_requested") {
		return `Review requested on PR ${target} in ${repo}`;
	}

	if (item.reason === "comment") {
		if (item.entity.type === "issue") {
			return `${actor ?? "Someone"} commented on issue ${target}`;
		}
		if (item.entity.type === "pull") {
			return `${actor ?? "Someone"} commented on PR ${target}`;
		}
		return `${actor ?? "Someone"} commented`;
	}

	if (item.reason === "mention" || item.reason === "team_mention") {
		if (item.entity.type === "issue") {
			return `${actor ?? "Someone"} mentioned you in issue ${target}`;
		}
		if (item.entity.type === "pull") {
			return `${actor ?? "Someone"} mentioned you in PR ${target}`;
		}
		return `${actor ?? "Someone"} mentioned you`;
	}

	if (item.reason === "security_alert") {
		return `Security alert opened in ${repo}`;
	}

	return item.contextLine;
}

export function NotificationRow({
	item,
	isUnread,
	isMarking,
	isSelected,
	isSelectMode,
	isDismissing,
	isMuted,
	onMarkRead,
	onToggleMute,
	onOpen,
	onToggleSelect,
}: {
	item: NotificationEnrichedItem;
	isUnread: boolean;
	isMarking: boolean;
	isSelected: boolean;
	isSelectMode: boolean;
	isDismissing: boolean;
	isMuted: boolean;
	onMarkRead: (id: string) => void;
	onToggleMute: (id: string) => void;
	onOpen: (item: NotificationEnrichedItem) => void;
	onToggleSelect: (id: string) => void;
}) {
	const router = useRouter();
	const secondary = buildSecondaryText(item);

	function openItemNewTab(url: string) {
		window.open(url, "_blank", "noopener,noreferrer");
	}

	function handleOpen(metaOrCtrlClick: boolean) {
		onOpen(item);
		if (metaOrCtrlClick) {
			openItemNewTab(item.href);
			return;
		}
		router.push(item.href);
	}

	return (
		<article
			role="button"
			tabIndex={0}
			onClick={(event) => {
				if (isSelectMode) {
					onToggleSelect(item.id);
					return;
				}
				handleOpen(event.metaKey || event.ctrlKey);
			}}
			onKeyDown={(event) => {
				if (event.key !== "Enter" && event.key !== " ") return;
				event.preventDefault();
				if (isSelectMode) {
					onToggleSelect(item.id);
					return;
				}
				handleOpen(false);
			}}
			className={cn(
				"group flex cursor-pointer items-start gap-3 border-b border-border/40 px-3 py-2.5 transition-all duration-150 last:border-b-0",
				"focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-foreground/20",
				"hover:bg-muted/25",
				isSelected ? "bg-muted/45 ring-1 ring-foreground/20" : "",
				isDismissing
					? "-translate-y-1 opacity-0"
					: "translate-y-0 opacity-100",
			)}
		>
			<div className="relative mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center text-muted-foreground/65">
				{isSelectMode ? (
					<input
						type="checkbox"
						checked={isSelected}
						onChange={() => onToggleSelect(item.id)}
						onClick={(event) => event.stopPropagation()}
						className="h-3.5 w-3.5 rounded border-border bg-transparent"
						aria-label="Select notification"
					/>
				) : (
					<NotificationTypeIcon
						subjectType={item.subjectType}
						className={
							isUnread
								? unreadIconAccent(
										item.statusKind,
										item.title,
										item.reason,
									)
								: "text-muted-foreground/55"
						}
					/>
				)}
			</div>

			<div className="min-w-0 flex-1">
				<p
					className={cn(
						"overflow-hidden text-[13px] leading-[1.3] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]",
						isUnread
							? "font-semibold text-foreground"
							: "font-medium text-foreground/85",
					)}
				>
					{item.title}
				</p>
				<p className="mt-0.5 truncate text-[11px] text-muted-foreground/75">
					{secondary}
				</p>
			</div>

			<div className="mt-0.5 flex shrink-0 flex-col items-end gap-1 pl-2">
				<span className="shrink-0 text-[10px] text-muted-foreground/60">
					<TimeAgo date={item.updatedAt} />
				</span>
				<div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-wide opacity-100 transition-opacity sm:pointer-events-none sm:opacity-0 sm:group-hover:pointer-events-auto sm:group-hover:opacity-100 sm:focus-within:pointer-events-auto sm:focus-within:opacity-100">
					<Link
						href={item.primaryAction.href}
						onClick={(event) => {
							event.stopPropagation();
							if (event.metaKey || event.ctrlKey) return;
							onOpen(item);
						}}
						className="text-muted-foreground/80 hover:text-foreground"
					>
						{item.primaryAction.label}
					</Link>
					<button
						type="button"
						disabled={isMarking}
						onClick={(event) => {
							event.stopPropagation();
							onMarkRead(item.id);
						}}
						className="text-muted-foreground/80 hover:text-foreground disabled:opacity-50"
					>
						{isMarking ? "..." : "Read"}
					</button>
					<button
						type="button"
						onClick={(event) => {
							event.stopPropagation();
							onToggleMute(item.id);
						}}
						className="text-muted-foreground/80 hover:text-foreground"
					>
						{isMuted ? "Unmute" : "Mute"}
					</button>
				</div>
			</div>
		</article>
	);
}
