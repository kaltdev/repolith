"use client";

import { ChevronDown, FileCode } from "lucide-react";
import type { ReviewThread } from "@/lib/github";
import { cn } from "@/lib/utils";
import { ReviewThreadCard } from "./review-thread-card";

export interface ReviewThreadFileGroup {
	filePath: string;
	threads: ReviewThread[];
	fileIndex?: number;
}

interface ReviewThreadListProps {
	groups: ReviewThreadFileGroup[];
	variant: "panel" | "sidebar";
	isFileExpanded: (path: string) => boolean;
	onToggleFile: (path: string) => void;
	owner?: string;
	repo?: string;
	pullNumber?: number;
	onNavigateToFile?: (index: number, line?: number | null) => void;
	onThreadMutated?: (thread: ReviewThread, resolved: boolean) => void;
}

export function ReviewThreadList({
	groups,
	variant,
	isFileExpanded,
	onToggleFile,
	owner,
	repo,
	pullNumber,
	onNavigateToFile,
	onThreadMutated,
}: ReviewThreadListProps) {
	return (
		<>
			{groups.map((group) => {
				const fileName = group.filePath.split("/").pop() || group.filePath;
				const dir = group.filePath.includes("/")
					? group.filePath.slice(
							0,
							group.filePath.lastIndexOf("/") + 1,
						)
					: "";
				const expanded = isFileExpanded(group.filePath);
				const unresolvedCount = group.threads.filter(
					(thread) => !thread.isResolved,
				).length;

				if (variant === "sidebar") {
					return (
						<div key={group.filePath}>
							<button
								onClick={() => {
									onToggleFile(
										group.filePath,
									);
									if (
										group.fileIndex !==
											undefined &&
										onNavigateToFile
									) {
										onNavigateToFile(
											group.fileIndex,
											null,
										);
									}
								}}
								className="w-full flex items-center gap-1.5 px-3 py-1.5 text-left hover:bg-muted/50 transition-colors cursor-pointer"
							>
								<ChevronDown
									className={cn(
										"w-3 h-3 shrink-0 text-muted-foreground/50 transition-transform",
										!expanded &&
											"-rotate-90",
									)}
								/>
								<span className="text-[11px] font-mono text-foreground/80 truncate flex-1 min-w-0">
									{fileName}
								</span>
								{unresolvedCount > 0 && (
									<span className="text-[9px] px-1 py-px rounded-full bg-warning/15 text-warning tabular-nums shrink-0">
										{unresolvedCount}
									</span>
								)}
								<span className="text-[9px] text-muted-foreground/50 tabular-nums shrink-0">
									{group.threads.length}
								</span>
							</button>

							{expanded && (
								<div className="pl-3 pr-2 pb-1 space-y-1">
									{group.threads.map(
										(thread) => (
											<ReviewThreadCard
												key={
													thread.id
												}
												thread={
													thread
												}
												variant="sidebar"
												owner={
													owner
												}
												repo={
													repo
												}
												pullNumber={
													pullNumber
												}
												onNavigate={() => {
													if (
														group.fileIndex !==
															undefined &&
														onNavigateToFile
													) {
														onNavigateToFile(
															group.fileIndex,
															thread.line,
														);
													}
												}}
												onThreadMutated={
													onThreadMutated
												}
											/>
										),
									)}
								</div>
							)}
						</div>
					);
				}

				return (
					<div
						key={group.filePath}
						className="border-b border-border/40"
					>
						<button
							onClick={() => onToggleFile(group.filePath)}
							className="w-full flex items-center gap-2 px-4 py-2 text-left hover:bg-muted/50 transition-colors cursor-pointer"
						>
							<ChevronDown
								className={cn(
									"w-3.5 h-3.5 text-muted-foreground/50 transition-transform duration-200 shrink-0",
									!expanded && "-rotate-90",
								)}
							/>
							<FileCode className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
							<span className="text-xs truncate flex-1 min-w-0">
								{dir && (
									<span className="text-muted-foreground/50">
										{dir}
									</span>
								)}
								<span className="font-medium text-foreground/80">
									{fileName}
								</span>
							</span>
							<span className="text-[10px] text-muted-foreground/60 shrink-0">
								{group.threads.length} thread
								{group.threads.length !== 1
									? "s"
									: ""}
							</span>
							{unresolvedCount > 0 && (
								<span className="text-[10px] text-warning/70 shrink-0">
									{unresolvedCount} open
								</span>
							)}
						</button>

						{expanded && (
							<div className="px-4 pb-2 space-y-2">
								{group.threads.map((thread) => (
									<ReviewThreadCard
										key={thread.id}
										thread={thread}
										variant="panel"
										owner={owner}
										repo={repo}
										pullNumber={
											pullNumber
										}
										onThreadMutated={
											onThreadMutated
										}
									/>
								))}
							</div>
						)}
					</div>
				);
			})}
		</>
	);
}
