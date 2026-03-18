"use client";

import type { KeyboardEvent, RefObject } from "react";
import {
	ArrowRight,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	Columns2,
	Eye,
	EyeOff,
	FileCode,
	Loader2,
	MessageSquare,
	Pencil,
	Search,
	WrapText,
	X,
} from "lucide-react";
import { FileTypeIcon } from "@/components/shared/file-icon";
import { cn } from "@/lib/utils";
import type { PRDiffFile } from "./review-models";

interface FileReviewHeaderProps {
	file: PRDiffFile;
	sidebarCollapsed: boolean;
	onToggleSidebar: () => void;
	viewed: boolean;
	onToggleViewed: () => void;
	disableViewedToggle?: boolean;
	viewedToggleTitle?: string;
	canWrite: boolean;
	headBranch?: string;
	isEditing: boolean;
	editView: "edit" | "changes";
	onEditViewChange: (view: "edit" | "changes") => void;
	onCancelEdit: () => void;
	onSaveEdit: () => void;
	onStartEdit: () => void;
	isLoadingEdit: boolean;
	showFullFile: boolean;
	isLoadingFullFile: boolean;
	onToggleFullFile: () => void;
	showChangeNavigation: boolean;
	onPrevChange: () => void;
	onNextChange: () => void;
	disableChangeNavigation: boolean;
	fileCommentCount: number;
	hideReviewComments: boolean;
	onToggleHideReviewComments: () => void;
	splitView: boolean;
	onToggleSplit: () => void;
	wordWrap: boolean;
	onToggleWrap: () => void;
	index: number;
	total: number;
	onPrevFile: () => void;
	onNextFile: () => void;
	searchOpen: boolean;
	searchQuery: string;
	searchMatchCount: number;
	currentSearchIndex: number;
	searchInputRef: RefObject<HTMLInputElement | null>;
	onSearchQueryChange: (value: string) => void;
	onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
	onPrevSearch: () => void;
	onNextSearch: () => void;
	matchCase: boolean;
	onToggleMatchCase: () => void;
	onCloseSearch: () => void;
}

export function FileReviewHeader({
	file,
	sidebarCollapsed,
	onToggleSidebar,
	viewed,
	onToggleViewed,
	disableViewedToggle = false,
	viewedToggleTitle,
	canWrite,
	headBranch,
	isEditing,
	editView,
	onEditViewChange,
	onCancelEdit,
	onSaveEdit,
	onStartEdit,
	isLoadingEdit,
	showFullFile,
	isLoadingFullFile,
	onToggleFullFile,
	showChangeNavigation,
	onPrevChange,
	onNextChange,
	disableChangeNavigation,
	fileCommentCount,
	hideReviewComments,
	onToggleHideReviewComments,
	splitView,
	onToggleSplit,
	wordWrap,
	onToggleWrap,
	index,
	total,
	onPrevFile,
	onNextFile,
	searchOpen,
	searchQuery,
	searchMatchCount,
	currentSearchIndex,
	searchInputRef,
	onSearchQueryChange,
	onSearchKeyDown,
	onPrevSearch,
	onNextSearch,
	matchCase,
	onToggleMatchCase,
	onCloseSearch,
}: FileReviewHeaderProps) {
	const dir = file.filename.includes("/")
		? file.filename.slice(0, file.filename.lastIndexOf("/") + 1)
		: "";
	const name = file.filename.slice(dir.length);

	return (
		<div className="shrink-0 sticky top-0 z-10 bg-card/95 backdrop-blur-sm border-b border-border overflow-hidden">
			<div className="flex items-center gap-2 px-3 py-1.5 overflow-hidden">
				<button
					onClick={onToggleSidebar}
					className="hidden lg:flex p-0.5 rounded transition-colors cursor-pointer shrink-0 text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/60"
					title={sidebarCollapsed ? "Show sidebar" : "Hide sidebar"}
				>
					{sidebarCollapsed ? (
						<ChevronRight className="w-3.5 h-3.5" />
					) : (
						<ChevronLeft className="w-3.5 h-3.5" />
					)}
				</button>

				<FileTypeIcon
					name={name}
					type="file"
					className="w-3.5 h-3.5 shrink-0"
				/>

				<span className="text-xs font-mono truncate flex-1 min-w-0">
					{dir && (
						<span className="text-muted-foreground/60">
							{dir}
						</span>
					)}
					<span className="text-foreground font-medium">{name}</span>
					{file.previous_filename && (
						<span className="text-muted-foreground/50 ml-2 inline-flex items-center gap-1">
							<ArrowRight className="w-2.5 h-2.5 inline" />
							<span className="line-through">
								{file.previous_filename
									.split("/")
									.pop()}
							</span>
						</span>
					)}
				</span>

				<span className="text-[11px] font-mono text-success tabular-nums shrink-0">
					+{file.additions}
				</span>
				<span className="text-[11px] font-mono text-destructive tabular-nums shrink-0">
					-{file.deletions}
				</span>

				<button
					disabled={disableViewedToggle}
					onClick={(event) => {
						event.stopPropagation();
						onToggleViewed();
					}}
					className={cn(
						"flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] transition-colors cursor-pointer shrink-0 ml-1",
						viewed
							? "bg-success/10 text-success"
							: "text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/60",
						disableViewedToggle &&
							"opacity-40 cursor-not-allowed",
					)}
					title={
						viewedToggleTitle ??
						(viewed ? "Mark as unreviewed" : "Mark as reviewed")
					}
				>
					{viewed ? (
						<Eye className="w-3 h-3" />
					) : (
						<EyeOff className="w-3 h-3" />
					)}
					{viewed ? "Viewed" : "Mark viewed"}
				</button>

				{canWrite &&
					headBranch &&
					file.status !== "removed" &&
					file.filename &&
					(isEditing ? (
						<div className="flex items-center gap-1 shrink-0">
							<div className="flex items-center bg-secondary/60 rounded overflow-hidden mr-1">
								<button
									onClick={() =>
										onEditViewChange(
											"edit",
										)
									}
									className={cn(
										"px-2 py-0.5 text-[10px] font-mono transition-colors cursor-pointer",
										editView === "edit"
											? "bg-accent text-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									Edit
								</button>
								<button
									onClick={() =>
										onEditViewChange(
											"changes",
										)
									}
									className={cn(
										"px-2 py-0.5 text-[10px] font-mono transition-colors cursor-pointer",
										editView ===
											"changes"
											? "bg-accent text-foreground"
											: "text-muted-foreground hover:text-foreground",
									)}
								>
									Changes
								</button>
							</div>
							<button
								onClick={onCancelEdit}
								className="px-2 py-0.5 rounded text-[10px] font-mono text-muted-foreground hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer"
							>
								Cancel
							</button>
							<button
								onClick={onSaveEdit}
								className="px-2 py-0.5 rounded text-[10px] font-mono bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer"
							>
								Save
							</button>
						</div>
					) : (
						<button
							onClick={onStartEdit}
							disabled={isLoadingEdit}
							className="p-0.5 rounded transition-colors cursor-pointer shrink-0 text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/60 disabled:opacity-40"
							title="Edit file"
						>
							{isLoadingEdit ? (
								<Loader2 className="w-3.5 h-3.5 animate-spin" />
							) : (
								<Pencil className="w-3.5 h-3.5" />
							)}
						</button>
					))}

				<button
					onClick={onToggleFullFile}
					disabled={isLoadingFullFile}
					className={cn(
						"p-0.5 rounded transition-colors cursor-pointer shrink-0",
						showFullFile
							? "bg-accent text-foreground"
							: "text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/60",
						"disabled:opacity-40",
					)}
					title={showFullFile ? "Show diff only" : "Show full file"}
				>
					{isLoadingFullFile ? (
						<Loader2 className="w-3.5 h-3.5 animate-spin" />
					) : (
						<FileCode className="w-3.5 h-3.5" />
					)}
				</button>

				{showChangeNavigation && (
					<div className="flex items-center gap-0.5 shrink-0">
						<span className="w-1.5 h-1.5 rounded-full bg-success/60 shrink-0" />
						<button
							disabled={disableChangeNavigation}
							onClick={onPrevChange}
							className="p-0.5 rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
							title="Previous PR change"
						>
							<ChevronUp className="w-3 h-3" />
						</button>
						<button
							disabled={disableChangeNavigation}
							onClick={onNextChange}
							className="p-0.5 rounded text-muted-foreground/50 hover:text-foreground hover:bg-accent/60 transition-colors cursor-pointer disabled:opacity-30 disabled:pointer-events-none"
							title="Next PR change"
						>
							<ChevronDown className="w-3 h-3" />
						</button>
					</div>
				)}

				{fileCommentCount > 0 && (
					<button
						onClick={onToggleHideReviewComments}
						className={cn(
							"p-0.5 rounded transition-colors cursor-pointer shrink-0",
							hideReviewComments
								? "bg-accent text-foreground"
								: "text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/60",
						)}
						title={
							hideReviewComments
								? "Show review comments"
								: "Hide review comments"
						}
					>
						<MessageSquare className="w-3.5 h-3.5" />
					</button>
				)}

				<button
					onClick={onToggleSplit}
					className={cn(
						"p-0.5 rounded transition-colors cursor-pointer shrink-0",
						splitView
							? "bg-accent text-foreground"
							: "text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/60",
					)}
					title={splitView ? "Unified diff" : "Split diff"}
				>
					<Columns2 className="w-3.5 h-3.5" />
				</button>

				<button
					onClick={onToggleWrap}
					className={cn(
						"p-0.5 rounded transition-colors cursor-pointer shrink-0",
						wordWrap
							? "bg-accent text-foreground"
							: "text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/60",
					)}
					title={wordWrap ? "Disable word wrap" : "Enable word wrap"}
				>
					<WrapText className="w-3.5 h-3.5" />
				</button>

				<div className="flex items-center gap-0.5 shrink-0">
					<button
						onClick={onPrevFile}
						disabled={index === 0}
						className="p-0.5 rounded hover:bg-accent disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
					>
						<ChevronLeft className="w-3.5 h-3.5" />
					</button>
					<span className="text-[10px] font-mono text-muted-foreground/60 tabular-nums min-w-[3ch] text-center">
						{index + 1}/{total}
					</span>
					<button
						onClick={onNextFile}
						disabled={index === total - 1}
						className="p-0.5 rounded hover:bg-accent disabled:opacity-20 disabled:cursor-not-allowed cursor-pointer transition-colors"
					>
						<ChevronRight className="w-3.5 h-3.5" />
					</button>
				</div>
			</div>

			{searchOpen && (
				<div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-border/50">
					<Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
					<input
						ref={searchInputRef}
						type="text"
						value={searchQuery}
						onChange={(event) =>
							onSearchQueryChange(event.target.value)
						}
						onKeyDown={onSearchKeyDown}
						placeholder="Find in diff..."
						className="flex-1 bg-transparent text-xs font-mono text-foreground placeholder:text-muted-foreground outline-none min-w-0"
						autoFocus
					/>
					{searchQuery && (
						<span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums shrink-0">
							{searchMatchCount > 0
								? `${currentSearchIndex + 1} of ${searchMatchCount}`
								: "No results"}
						</span>
					)}
					<div className="flex items-center gap-0.5 shrink-0">
						<button
							onClick={onPrevSearch}
							disabled={searchMatchCount === 0}
							className="p-0.5 text-muted-foreground/50 hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
							title="Previous match (Shift+Enter)"
						>
							<ChevronUp className="w-3.5 h-3.5" />
						</button>
						<button
							onClick={onNextSearch}
							disabled={searchMatchCount === 0}
							className="p-0.5 text-muted-foreground/50 hover:text-foreground disabled:opacity-30 transition-colors cursor-pointer"
							title="Next match (Enter)"
						>
							<ChevronDown className="w-3.5 h-3.5" />
						</button>
						<button
							onClick={onToggleMatchCase}
							className={cn(
								"px-1 py-0.5 rounded text-[10px] font-mono font-bold transition-colors cursor-pointer",
								matchCase
									? "text-foreground bg-accent"
									: "text-muted-foreground hover:text-foreground",
							)}
							title="Match case"
						>
							Aa
						</button>
						<button
							onClick={onCloseSearch}
							className="p-0.5 text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer"
							title="Close (Escape)"
						>
							<X className="w-3.5 h-3.5" />
						</button>
					</div>
				</div>
			)}
		</div>
	);
}
