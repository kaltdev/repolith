"use client";

import React, {
	useState,
	useTransition,
	useRef,
	useCallback,
	useEffect,
	useMemo,
	useOptimistic,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { parseDiffPatch, type DiffLine, type DiffSegment } from "@/lib/github-utils";
import type { SyntaxToken } from "@/lib/shiki";
import { highlightDiffLinesClient } from "@/lib/shiki-client";
import { useColorTheme } from "@/components/theme/theme-provider";
import { cn } from "@/lib/utils";
import { TimeAgo } from "@/components/ui/time-ago";
import { GithubAvatar } from "@/components/shared/github-avatar";
import {
	File,
	ChevronDown,
	Loader2,
	CornerDownLeft,
	Code2,
	MessageSquare,
	UnfoldVertical,
	Ghost,
	GitCommitHorizontal,
	EyeOff,
} from "lucide-react";
import { commitFileEditOnPR } from "@/app/(app)/repos/[owner]/[repo]/pulls/pr-actions";
import {
	deletePRReviewDraftCommentAction,
	savePRReviewWorkspacePreferencesAction,
	setPRReviewFileStateAction,
	setPRReviewFileStatesAction,
	upsertPRReviewDraftCommentAction,
} from "@/app/(app)/repos/[owner]/[repo]/pulls/review-workspace-actions";
import { CommitDialog } from "@/components/shared/commit-dialog";
import { useGlobalChatOptional } from "@/components/shared/global-chat-provider";
import { MarkdownEditor, type MarkdownEditorRef } from "@/components/shared/markdown-editor";
import type { ReviewThread, CheckStatus } from "@/lib/github";
import { ClientMarkdown } from "@/components/shared/client-markdown";
import { CheckStatusBadge } from "@/components/pr/check-status-badge";
import { useMutationEvents } from "@/components/shared/mutation-event-provider";
import { UserTooltip } from "@/components/shared/user-tooltip";
import {
	DEFAULT_DIFF_PREFERENCES,
	type DiffViewMode,
	type DiffFontSize,
	getDiffPreferences,
	setDiffPreferences,
} from "@/lib/diff-preferences";
import {
	buildPRReviewClientLineFingerprint,
	getPRReviewClientRangeContent,
} from "@/lib/pr-review-fingerprints-client";
import { buildPRReviewFileFingerprint } from "@/lib/pr-review-fingerprints";
import type { PRReviewWorkspacePageData } from "@/lib/pr-review-types";
import { DiffFileTree } from "./diff-file-tree";
import { DiffTreeSettingsPopover } from "./diff-tree-settings";
import { DiffViewport } from "./review/diff-viewport";
import { SyntaxSegmentedContent } from "./review/diff-content";
import { buildDiffViewportModel } from "./review/diff-viewport-model";
import { FileReviewHeader } from "./review/file-review-header";
import { PRReviewShell } from "./review/pr-review-shell";
import {
	applyPRReviewViewedFileAction,
	buildPRReviewViewerPreferences,
	buildVisiblePRReviewFiles,
	getActiveViewedFilePaths,
} from "./review/review-workspace-ui";
import {
	type AddContextCallback,
	type PRDiffFile as DiffFile,
	type PRReviewComment as ReviewComment,
	type PRReviewSummary as ReviewSummary,
} from "./review/review-models";
import { ReviewStateBadge } from "./review/review-state-badge";
import { ReviewThreadList } from "./review/review-thread-list";
import { parseSuggestionBlock } from "./review/suggestion-parser";
import { SuggestionBlock } from "./review/suggestion-block";

interface PRCommit {
	sha: string;
	commit: {
		message: string;
		author: { name: string; date: string } | null;
		verification?: {
			verified: boolean;
			reason: string;
		};
	};
	author: { login: string; avatar_url: string } | null;
}

interface PRDiffViewerProps {
	files: DiffFile[];
	reviewComments?: ReviewComment[];
	reviewThreads?: ReviewThread[];
	reviewSummaries?: ReviewSummary[];
	commits?: PRCommit[];
	owner?: string;
	repo?: string;
	pullNumber?: number;
	headSha?: string;
	headBranch?: string;
	baseSha?: string;
	canWrite?: boolean;
	highlightData?: Record<string, Record<string, SyntaxToken[]>>;
	participants?: Array<{ login: string; avatar_url: string }>;
	checkStatus?: CheckStatus;
	reviewWorkspaceData: PRReviewWorkspacePageData;
	canPersistReviewWorkspace?: boolean;
}

type SidebarMode = "files" | "reviews" | "commits";

function parseLineParam(
	param: string,
): { type: "single"; line: number } | { type: "range"; start: number; end: number } | null {
	const rangeMatch = param.match(/^(\d+)-(\d+)$/);
	if (rangeMatch) {
		const start = parseInt(rangeMatch[1], 10);
		const end = parseInt(rangeMatch[2], 10);
		if (start > 0 && end >= start) return { type: "range", start, end };
		return null;
	}
	const single = parseInt(param, 10);
	if (Number.isFinite(single) && single > 0) return { type: "single", line: single };
	return null;
}

function mapDraftCommentToReviewComment(
	comment: PRReviewWorkspacePageData["draftComments"][number],
): ReviewComment {
	const anchorLine = comment.endLine ?? comment.startLine ?? null;

	return {
		id: comment.id,
		user: null,
		body: comment.body,
		path: comment.path,
		line: anchorLine,
		start_line: comment.startLine,
		original_line: anchorLine,
		side: comment.side,
		created_at: comment.createdAt,
		isDraft: true,
		isStale: comment.isStale,
		replyToCommentId: comment.replyToCommentId,
		suggestions: comment.suggestions,
	};
}

function isEditableKeyTarget(target: EventTarget | null): boolean {
	if (!(target instanceof HTMLElement)) {
		return false;
	}

	if (target.isContentEditable) {
		return true;
	}

	return !!target.closest(
		"input, textarea, select, [contenteditable='true'], [role='textbox']",
	);
}

export function PRDiffViewer({
	files,
	reviewComments = [],
	reviewThreads = [],
	reviewSummaries = [],
	commits = [],
	owner,
	repo,
	pullNumber,
	headSha,
	headBranch,
	baseSha,
	canWrite = true,
	highlightData = {},
	participants,
	checkStatus,
	reviewWorkspaceData,
	canPersistReviewWorkspace = false,
}: PRDiffViewerProps) {
	const globalChat = useGlobalChatOptional();
	const onAddContext = globalChat?.addCodeContext;
	const searchParams = useSearchParams();

	const { themeId, storeThemes } = useColorTheme();
	const initialThemeRef = useRef(themeId);
	const [clientHighlightData, setClientHighlightData] =
		useState<Record<string, Record<string, SyntaxToken[]>>>(highlightData);

	const isMpTheme = themeId.startsWith("mp:");

	useEffect(() => {
		if (themeId === initialThemeRef.current && !isMpTheme) {
			setClientHighlightData(highlightData);
			return;
		}
		if (isMpTheme && storeThemes.length === 0) {
			return;
		}
		let cancelled = false;
		(async () => {
			const data: Record<string, Record<string, SyntaxToken[]>> = {};
			await Promise.all(
				files.map(async (file) => {
					if (file.patch) {
						try {
							data[file.filename] =
								await highlightDiffLinesClient(
									file.patch,
									file.filename,
									themeId,
								);
						} catch {}
					}
				}),
			);
			if (!cancelled) setClientHighlightData(data);
		})();
		return () => {
			cancelled = true;
		};
	}, [themeId, isMpTheme, storeThemes, files, highlightData]);

	// Resolve initial index from ?file= query param
	const [activeIndex, setActiveIndex] = useState(() => {
		const fileParam = searchParams.get("file");
		if (fileParam) {
			const idx = files.findIndex((f) => f.filename === fileParam);
			if (idx >= 0) return idx;
		}
		return 0;
	});
	const [sidebarWidth, setSidebarWidth] = useState(300);
	const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => {
		const sidebar = searchParams.get("sidebar");
		if (sidebar === "reviews" || sidebar === "commits") return sidebar;
		return "files";
	});
	const [scrollToLine, setScrollToLine] = useState<number | null>(() => {
		const lineParam = searchParams.get("line");
		if (!lineParam) return null;
		const parsed = parseLineParam(lineParam);
		if (!parsed) return null;
		return parsed.type === "single" ? parsed.line : parsed.start;
	});
	const [highlightLines, setHighlightLines] = useState<Set<number> | null>(() => {
		const lineParam = searchParams.get("line");
		if (!lineParam) return null;
		const parsed = parseLineParam(lineParam);
		if (!parsed) return null;
		if (parsed.type === "range") {
			const s = new Set<number>();
			for (let i = parsed.start; i <= parsed.end; i++) s.add(i);
			return s;
		}
		return null;
	});
	const containerRef = useRef<HTMLDivElement>(null);
	const [workspaceError, setWorkspaceError] = useState<string | null>(null);
	const [isFileStatePending, startFileStateTransition] = useTransition();
	const [isPreferencesPending, startPreferencesTransition] = useTransition();
	const [viewerPreferences, setViewerPreferences] = useState(() =>
		buildPRReviewViewerPreferences(
			reviewWorkspaceData.workspace,
			DEFAULT_DIFF_PREFERENCES,
		),
	);
	const [persistedViewedPaths, setPersistedViewedPaths] = useState(() =>
		getActiveViewedFilePaths(reviewWorkspaceData.fileStates),
	);
	const [optimisticViewedPaths, applyViewedPathAction] = useOptimistic(
		persistedViewedPaths,
		applyPRReviewViewedFileAction,
	);

	useEffect(() => {
		setViewerPreferences(
			buildPRReviewViewerPreferences(
				reviewWorkspaceData.workspace,
				getDiffPreferences(),
			),
		);
	}, [reviewWorkspaceData.workspace]);

	useEffect(() => {
		if (!reviewWorkspaceData.workspace) return;

		const localPatch: Partial<{
			splitView: boolean;
			wordWrap: boolean;
			defaultViewMode: DiffViewMode;
			fontSize: DiffFontSize;
			showFolderDiffCount: boolean;
		}> = {};

		if (reviewWorkspaceData.workspace.splitView != null) {
			localPatch.splitView = reviewWorkspaceData.workspace.splitView;
		}
		if (reviewWorkspaceData.workspace.wordWrap != null) {
			localPatch.wordWrap = reviewWorkspaceData.workspace.wordWrap;
		}
		if (reviewWorkspaceData.workspace.defaultViewMode != null) {
			localPatch.defaultViewMode = reviewWorkspaceData.workspace
				.defaultViewMode as DiffViewMode;
		}
		if (reviewWorkspaceData.workspace.fontSize != null) {
			localPatch.fontSize = reviewWorkspaceData.workspace
				.fontSize as DiffFontSize;
		}
		if (reviewWorkspaceData.workspace.showFolderDiffCount != null) {
			localPatch.showFolderDiffCount =
				reviewWorkspaceData.workspace.showFolderDiffCount;
		}

		if (Object.keys(localPatch).length > 0) {
			setDiffPreferences(localPatch);
		}
	}, [reviewWorkspaceData.workspace]);

	useEffect(() => {
		setPersistedViewedPaths(getActiveViewedFilePaths(reviewWorkspaceData.fileStates));
	}, [reviewWorkspaceData.fileStates]);

	useEffect(() => {
		if (files.length === 0) return;
		setActiveIndex((currentIndex) => Math.min(currentIndex, files.length - 1));
	}, [files.length]);

	const reviewFiles = useMemo(
		() =>
			files.map((file) => ({
				filename: file.filename,
				status: file.status,
				additions: file.additions,
				deletions: file.deletions,
				patch: file.patch,
				previousFilename: file.previous_filename ?? null,
			})),
		[files],
	);
	const fileFingerprintByPath = useMemo(
		() =>
			new Map(
				reviewFiles.map((file) => [
					file.filename,
					buildPRReviewFileFingerprint(file),
				]),
			),
		[reviewFiles],
	);
	const viewedFiles = useMemo(() => new Set(optimisticViewedPaths), [optimisticViewedPaths]);
	const totalAdditions = files.reduce((sum, file) => sum + file.additions, 0);
	const totalDeletions = files.reduce((sum, file) => sum + file.deletions, 0);
	const draftInlineComments = useMemo(
		() =>
			reviewWorkspaceData.draftComments
				.filter((comment) => comment.replyToCommentId == null)
				.map(mapDraftCommentToReviewComment),
		[reviewWorkspaceData.draftComments],
	);
	const draftRepliesByFile = useMemo(() => {
		const next = new Map<string, ReviewComment[]>();
		for (const draftReply of reviewWorkspaceData.draftComments) {
			if (draftReply.replyToCommentId == null) continue;
			const existing = next.get(draftReply.path) || [];
			existing.push(mapDraftCommentToReviewComment(draftReply));
			next.set(draftReply.path, existing);
		}
		return next;
	}, [reviewWorkspaceData.draftComments]);

	const commentsByFile = useMemo(() => {
		const next = new Map<string, ReviewComment[]>();
		for (const reviewComment of [...reviewComments, ...draftInlineComments]) {
			const existing = next.get(reviewComment.path) || [];
			existing.push(reviewComment);
			next.set(reviewComment.path, existing);
		}
		for (const comments of next.values()) {
			comments.sort((left, right) =>
				left.created_at.localeCompare(right.created_at),
			);
		}
		return next;
	}, [draftInlineComments, reviewComments]);

	const threadsByFile = useMemo(() => {
		const next = new Map<string, ReviewThread[]>();
		for (const reviewThread of reviewThreads) {
			const existing = next.get(reviewThread.path) || [];
			existing.push(reviewThread);
			next.set(reviewThread.path, existing);
		}
		return next;
	}, [reviewThreads]);

	const unresolvedThreadCount = reviewThreads.filter((thread) => !thread.isResolved).length;
	const currentFile = files[activeIndex];
	const visibleFiles = useMemo(
		() =>
			buildVisiblePRReviewFiles(files, {
				hideViewedFiles: viewerPreferences.hideViewedFiles,
				viewedFiles,
				activeFilename: currentFile?.filename ?? null,
				threadsByFile,
			}),
		[
			currentFile?.filename,
			files,
			threadsByFile,
			viewedFiles,
			viewerPreferences.hideViewedFiles,
		],
	);
	const fileIndexByPath = useMemo(
		() => new Map(files.map((file, index) => [file.filename, index])),
		[files],
	);
	const visibleFileIndices = useMemo(
		() => visibleFiles.map((file) => fileIndexByPath.get(file.filename) ?? 0),
		[visibleFiles, fileIndexByPath],
	);
	const visibleActiveIndex = currentFile
		? visibleFiles.findIndex((file) => file.filename === currentFile.filename)
		: -1;
	const viewedCount = viewedFiles.size;
	const hiddenViewedCount = Math.max(files.length - visibleFiles.length, 0);

	// Sync active file to URL ?file= param (only when activeIndex changes)
	const prevIndexRef = useRef(activeIndex);
	useEffect(() => {
		if (!currentFile) return;
		if (
			prevIndexRef.current === activeIndex &&
			searchParams.get("file") === currentFile.filename
		)
			return;
		const fileChanged = prevIndexRef.current !== activeIndex;
		prevIndexRef.current = activeIndex;
		const url = new URL(window.location.href);
		url.searchParams.set("file", currentFile.filename);
		const navLine = pendingNavLineRef.current;
		pendingNavLineRef.current = null;
		if (fileChanged) {
			if (navLine) {
				url.searchParams.set("line", String(navLine));
			} else {
				url.searchParams.delete("line");
				setHighlightLines(null);
			}
		}
		window.history.replaceState(null, "", url.toString());
	}, [activeIndex, currentFile]); // eslint-disable-line react-hooks/exhaustive-deps

	// Sync sidebar mode to URL ?sidebar= param
	useEffect(() => {
		const url = new URL(window.location.href);
		if (sidebarMode === "files") {
			url.searchParams.delete("sidebar");
		} else {
			url.searchParams.set("sidebar", sidebarMode);
		}
		window.history.replaceState(null, "", url.toString());
	}, [sidebarMode]);

	// Listen for Ghost chat file navigation events
	const pendingNavLineRef = useRef<number | null>(null);
	useEffect(() => {
		const handler = (e: Event) => {
			const { filename, line } = (
				e as CustomEvent<{ filename: string; line?: number }>
			).detail;
			const idx = files.findIndex((f) => f.filename === filename);
			if (idx >= 0) {
				if (line) {
					pendingNavLineRef.current = line;
					setScrollToLine(line);
					setHighlightLines(new Set([line]));
				}
				setActiveIndex(idx);
			}
		};
		window.addEventListener("ghost:navigate-to-file", handler);
		return () => window.removeEventListener("ghost:navigate-to-file", handler);
	}, [files]);

	const handleScrollComplete = useCallback(() => setScrollToLine(null), []);

	const goToPrev = useCallback(() => {
		if (visibleActiveIndex <= 0) return;
		const nextIndex = visibleFileIndices[visibleActiveIndex - 1];
		if (nextIndex !== undefined) setActiveIndex(nextIndex);
	}, [visibleActiveIndex, visibleFileIndices]);
	const goToNext = useCallback(() => {
		if (visibleActiveIndex < 0 || visibleActiveIndex >= visibleFileIndices.length - 1)
			return;
		const nextIndex = visibleFileIndices[visibleActiveIndex + 1];
		if (nextIndex !== undefined) setActiveIndex(nextIndex);
	}, [visibleActiveIndex, visibleFileIndices]);

	const handleSidebarResize = useCallback((clientX: number) => {
		if (!containerRef.current) return;
		const rect = containerRef.current.getBoundingClientRect();
		const x = clientX - rect.left;
		setSidebarWidth(Math.max(140, Math.min(600, x)));
	}, []);

	const canPersistWorkspaceState =
		canPersistReviewWorkspace && owner != null && repo != null && pullNumber != null;
	const canPersistWorkspacePreferences =
		canPersistWorkspaceState && headSha != null && baseSha != null;

	const updateDiffViewerPreferences = useCallback(
		(
			patch: Partial<{
				splitView: boolean;
				wordWrap: boolean;
				defaultViewMode: DiffViewMode;
				fontSize: DiffFontSize;
				showFolderDiffCount: boolean;
			}>,
		) => {
			setWorkspaceError(null);
			setViewerPreferences((currentPreferences) => ({
				...currentPreferences,
				...patch,
			}));
			setDiffPreferences(patch);

			if (!canPersistWorkspacePreferences) {
				return;
			}

			startPreferencesTransition(async () => {
				const result = await savePRReviewWorkspacePreferencesAction({
					owner: owner!,
					repo: repo!,
					pullNumber: pullNumber!,
					headSha: headSha!,
					baseSha: baseSha!,
					...patch,
				});

				if ("success" in result && result.success) {
					return;
				}

				setWorkspaceError(
					`${"error" in result ? result.error : "Failed to save review preferences"}. Kept local diff preferences.`,
				);
			});
		},
		[baseSha, canPersistWorkspacePreferences, headSha, owner, pullNumber, repo],
	);

	const toggleHideViewedFiles = useCallback(() => {
		if (!canPersistWorkspacePreferences) {
			setWorkspaceError("Sign in to save viewed-file filters for this review.");
			return;
		}

		const nextHideViewedFiles = !viewerPreferences.hideViewedFiles;
		setWorkspaceError(null);
		setViewerPreferences((currentPreferences) => ({
			...currentPreferences,
			hideViewedFiles: nextHideViewedFiles,
		}));

		startPreferencesTransition(async () => {
			const result = await savePRReviewWorkspacePreferencesAction({
				owner: owner!,
				repo: repo!,
				pullNumber: pullNumber!,
				headSha: headSha!,
				baseSha: baseSha!,
				hideViewedFiles: nextHideViewedFiles,
			});

			if ("success" in result && result.success) {
				return;
			}

			setViewerPreferences((currentPreferences) => ({
				...currentPreferences,
				hideViewedFiles: !nextHideViewedFiles,
			}));
			setWorkspaceError(
				"error" in result
					? result.error
					: "Failed to save viewed-file filter",
			);
		});
	}, [
		baseSha,
		canPersistWorkspacePreferences,
		headSha,
		owner,
		pullNumber,
		repo,
		viewerPreferences.hideViewedFiles,
	]);

	const updateViewedFiles = useCallback(
		(paths: string[], viewed: boolean) => {
			if (!canPersistWorkspaceState) {
				setWorkspaceError("Sign in to persist file review state.");
				return;
			}

			const inputs = paths
				.map((path) => {
					const fileFingerprint = fileFingerprintByPath.get(path);
					if (!fileFingerprint) return null;
					return {
						owner: owner!,
						repo: repo!,
						pullNumber: pullNumber!,
						path,
						fileFingerprint,
						viewed,
					};
				})
				.filter(
					(input): input is NonNullable<typeof input> =>
						input != null,
				);

			if (inputs.length === 0) {
				return;
			}

			setWorkspaceError(null);
			applyViewedPathAction({ paths: inputs.map((input) => input.path), viewed });

			startFileStateTransition(async () => {
				const result =
					inputs.length === 1
						? await setPRReviewFileStateAction(inputs[0])
						: await setPRReviewFileStatesAction(inputs);

				if ("success" in result && result.success) {
					setPersistedViewedPaths((currentPaths) =>
						applyPRReviewViewedFileAction(currentPaths, {
							paths: inputs.map((input) => input.path),
							viewed,
						}),
					);
					return;
				}

				setWorkspaceError(
					"error" in result
						? result.error
						: "Failed to update viewed state",
				);
			});
		},
		[
			applyViewedPathAction,
			canPersistWorkspaceState,
			fileFingerprintByPath,
			owner,
			pullNumber,
			repo,
		],
	);

	const toggleViewed = useCallback(
		(filename: string) => updateViewedFiles([filename], !viewedFiles.has(filename)),
		[updateViewedFiles, viewedFiles],
	);

	const setFilesViewed = useCallback(
		(filenames: string[], viewed: boolean) => updateViewedFiles(filenames, viewed),
		[updateViewedFiles],
	);

	return (
		<div ref={containerRef} className="flex flex-1 min-h-0 min-w-0">
			<PRReviewShell
				sidebarCollapsed={sidebarCollapsed}
				sidebarWidth={sidebarWidth}
				isSidebarDragging={isDragging}
				onSidebarResize={handleSidebarResize}
				onSidebarDragStart={() => setIsDragging(true)}
				onSidebarDragEnd={() => setIsDragging(false)}
				onSidebarReset={() => setSidebarWidth(220)}
				sidebar={
					<>
						<div className="shrink-0 flex items-center gap-2 px-3 py-2">
							<span className="text-[11px] font-mono text-foreground font-medium">
								{files.length} file
								{files.length !== 1 ? "s" : ""}
							</span>
							<span className="text-[10px] font-mono text-success">
								+{totalAdditions}
							</span>
							<span className="text-[10px] font-mono text-destructive">
								-{totalDeletions}
							</span>
							{viewedCount > 0 && (
								<span className="text-[10px] font-mono text-muted-foreground/60">
									{viewedCount}/{files.length}
								</span>
							)}
							{hiddenViewedCount > 0 &&
								viewerPreferences.hideViewedFiles && (
									<span className="text-[10px] font-mono text-muted-foreground/50">
										{hiddenViewedCount}{" "}
										hidden
									</span>
								)}
							<div className="flex items-center gap-0.5 ml-auto">
								<button
									onClick={() =>
										setSidebarMode(
											"files",
										)
									}
									className={cn(
										"p-1 rounded transition-colors cursor-pointer",
										sidebarMode ===
											"files"
											? "text-foreground bg-accent"
											: "text-muted-foreground/60 hover:text-muted-foreground",
									)}
									title="Files"
								>
									<Code2 className="w-3.5 h-3.5" />
								</button>
								<button
									onClick={() =>
										setSidebarMode(
											"reviews",
										)
									}
									className={cn(
										"p-1 rounded transition-colors cursor-pointer relative",
										sidebarMode ===
											"reviews"
											? "text-foreground bg-accent"
											: "text-muted-foreground/60 hover:text-muted-foreground",
									)}
									title="Reviews"
								>
									<MessageSquare className="w-3.5 h-3.5" />
									{unresolvedThreadCount >
										0 && (
										<span className="absolute -top-1 -right-1 w-3.5 h-3.5 flex items-center justify-center text-[8px] font-mono rounded-full bg-warning/20 text-warning">
											{
												unresolvedThreadCount
											}
										</span>
									)}
								</button>
								<button
									onClick={() =>
										setSidebarMode(
											"commits",
										)
									}
									className={cn(
										"p-1 rounded transition-colors cursor-pointer relative",
										sidebarMode ===
											"commits"
											? "text-foreground bg-accent"
											: "text-muted-foreground/60 hover:text-muted-foreground",
									)}
									title="Commits"
								>
									<GitCommitHorizontal className="w-3.5 h-3.5" />
									{commits.length > 0 && (
										<span className="absolute -top-1 -right-1 w-3.5 h-3.5 flex items-center justify-center text-[8px] font-mono rounded-full bg-info/20 text-info">
											{
												commits.length
											}
										</span>
									)}
								</button>
								<button
									onClick={
										toggleHideViewedFiles
									}
									disabled={
										isPreferencesPending ||
										!canPersistWorkspacePreferences
									}
									className={cn(
										"p-1 rounded transition-colors cursor-pointer",
										viewerPreferences.hideViewedFiles
											? "text-foreground bg-accent"
											: "text-muted-foreground/60 hover:text-muted-foreground",
										(isPreferencesPending ||
											!canPersistWorkspacePreferences) &&
											"opacity-40 cursor-not-allowed",
									)}
									title={
										canPersistWorkspacePreferences
											? viewerPreferences.hideViewedFiles
												? "Show viewed files"
												: "Hide viewed files"
											: "Sign in to persist viewed-file filters"
									}
								>
									<EyeOff className="w-3.5 h-3.5" />
								</button>
								<DiffTreeSettingsPopover
									preferences={{
										defaultViewMode:
											viewerPreferences.defaultViewMode,
										fontSize: viewerPreferences.fontSize,
										showFolderDiffCount:
											viewerPreferences.showFolderDiffCount,
									}}
									onSettingsChange={
										updateDiffViewerPreferences
									}
									disabled={
										isPreferencesPending
									}
								/>
							</div>
						</div>
						{workspaceError && (
							<div
								className="shrink-0 mx-3 mb-2 rounded-md border border-warning/20 bg-warning/5 px-2.5 py-2 text-[10px] text-warning"
								role="status"
								aria-live="polite"
							>
								{workspaceError}
							</div>
						)}
						<div
							className={cn(
								"shrink-0 h-1 mx-3 rounded-full overflow-hidden transition-all duration-300",
								viewedCount === 0
									? "bg-border/20"
									: "bg-border/60",
							)}
						>
							<div
								className="h-full bg-success/70 transition-all duration-300 rounded-full"
								style={{
									width: `${files.length > 0 ? (viewedCount / files.length) * 100 : 0}%`,
								}}
							/>
						</div>
						<div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
							{sidebarMode === "files" ? (
								<DiffFileTree
									files={visibleFiles}
									activeIndex={Math.max(
										visibleActiveIndex,
										0,
									)}
									onSelectFile={(index) => {
										const nextIndex =
											visibleFileIndices[
												index
											];
										if (
											nextIndex !==
											undefined
										) {
											setActiveIndex(
												nextIndex,
											);
										}
									}}
									viewedFiles={viewedFiles}
									threadsByFile={
										threadsByFile
									}
									onToggleViewed={
										toggleViewed
									}
									onSetFilesViewed={
										setFilesViewed
									}
									canToggleViewed={
										canPersistWorkspaceState &&
										!isFileStatePending
									}
									defaultViewMode={
										viewerPreferences.defaultViewMode
									}
									fontSize={
										viewerPreferences.fontSize
									}
									showFolderDiffCount={
										viewerPreferences.showFolderDiffCount
									}
								/>
							) : sidebarMode === "commits" ? (
								<SidebarCommits
									commits={commits}
									owner={owner}
									repo={repo}
									checkStatus={checkStatus}
								/>
							) : (
								<SidebarReviews
									files={files}
									threadsByFile={
										threadsByFile
									}
									reviewSummaries={
										reviewSummaries
									}
									onNavigateToFile={(
										index,
										line,
									) => {
										setActiveIndex(
											index,
										);
										setScrollToLine(
											line ??
												null,
										);
									}}
									owner={owner}
									repo={repo}
									pullNumber={pullNumber}
								/>
							)}
						</div>
					</>
				}
			>
				{currentFile && (
					<SingleFileDiff
						file={currentFile}
						index={Math.max(visibleActiveIndex, 0)}
						total={visibleFiles.length}
						wordWrap={viewerPreferences.wordWrap}
						splitView={viewerPreferences.splitView}
						onToggleWrap={() =>
							updateDiffViewerPreferences({
								wordWrap: !viewerPreferences.wordWrap,
							})
						}
						onToggleSplit={() =>
							updateDiffViewerPreferences({
								splitView: !viewerPreferences.splitView,
							})
						}
						sidebarCollapsed={sidebarCollapsed}
						onToggleSidebar={() =>
							setSidebarCollapsed((c) => !c)
						}
						onPrev={goToPrev}
						onNext={goToNext}
						fileComments={
							commentsByFile.get(currentFile.filename) ||
							[]
						}
						viewed={viewedFiles.has(currentFile.filename)}
						onToggleViewed={() =>
							toggleViewed(currentFile.filename)
						}
						canToggleViewed={
							canPersistWorkspaceState &&
							!isFileStatePending
						}
						owner={owner}
						repo={repo}
						pullNumber={pullNumber}
						headSha={headSha}
						headBranch={headBranch}
						baseSha={baseSha}
						scrollToLine={scrollToLine}
						onScrollComplete={handleScrollComplete}
						highlightLines={highlightLines}
						canWrite={canWrite}
						fileHighlightData={
							clientHighlightData[currentFile.filename]
						}
						onAddContext={onAddContext}
						participants={participants}
						draftReplies={
							draftRepliesByFile.get(
								currentFile.filename,
							) || []
						}
						canPersistReviewWorkspace={
							canPersistReviewWorkspace
						}
					/>
				)}
			</PRReviewShell>
		</div>
	);
}

function SingleFileDiff({
	file,
	index,
	total,
	wordWrap,
	splitView,
	onToggleWrap,
	onToggleSplit,
	sidebarCollapsed,
	onToggleSidebar,
	onPrev,
	onNext,
	fileComments,
	viewed,
	onToggleViewed,
	canToggleViewed,
	owner,
	repo,
	pullNumber,
	headSha,
	headBranch,
	baseSha,
	scrollToLine,
	onScrollComplete,
	highlightLines,
	canWrite = true,
	fileHighlightData,
	onAddContext,
	participants,
	draftReplies,
	canPersistReviewWorkspace,
}: {
	file: DiffFile;
	index: number;
	total: number;
	wordWrap: boolean;
	splitView: boolean;
	onToggleWrap: () => void;
	onToggleSplit: () => void;
	sidebarCollapsed: boolean;
	onToggleSidebar: () => void;
	onPrev: () => void;
	onNext: () => void;
	fileComments: ReviewComment[];
	viewed: boolean;
	onToggleViewed: () => void;
	canToggleViewed: boolean;
	owner?: string;
	repo?: string;
	pullNumber?: number;
	headSha?: string;
	headBranch?: string;
	baseSha?: string;
	scrollToLine?: number | null;
	onScrollComplete?: () => void;
	highlightLines?: Set<number> | null;
	canWrite?: boolean;
	fileHighlightData?: Record<string, SyntaxToken[]>;
	onAddContext?: AddContextCallback;
	participants?: Array<{ login: string; avatar_url: string }>;
	draftReplies: ReviewComment[];
	canPersistReviewWorkspace: boolean;
}) {
	const { emit } = useMutationEvents();
	const lines = useMemo(() => (file.patch ? parseDiffPatch(file.patch) : []), [file.patch]);
	const diffViewportModel = useMemo(() => buildDiffViewportModel(lines), [lines]);
	const hunkInfos = diffViewportModel.hunkInfos;
	const diffContainerRef = useRef<HTMLDivElement>(null);
	const onScrollCompleteRef = useRef(onScrollComplete);
	onScrollCompleteRef.current = onScrollComplete;

	useEffect(() => {
		if (scrollToLine == null || !diffContainerRef.current) return;
		const row = diffContainerRef.current.querySelector(`[data-line="${scrollToLine}"]`);
		if (row) {
			requestAnimationFrame(() => {
				row.scrollIntoView({ behavior: "smooth", block: "center" });
				if (!highlightLines?.has(scrollToLine)) {
					row.classList.add("!bg-warning/10");
					setTimeout(
						() => row.classList.remove("!bg-warning/10"),
						2000,
					);
				}
			});
		}
		onScrollCompleteRef.current?.();
	}, [scrollToLine]); // eslint-disable-line react-hooks/exhaustive-deps
	const [commentRange, setCommentRange] = useState<{
		startLine: number;
		endLine: number;
		side: "LEFT" | "RIGHT";
	} | null>(null);
	// Track which line the user started clicking on for drag-select
	const [selectingFrom, setSelectingFrom] = useState<{
		line: number;
		side: "LEFT" | "RIGHT";
	} | null>(null);
	const [hoverLine, setHoverLine] = useState<number | null>(null);
	const hoverLineRef = useRef<number | null>(null);
	const [hideReviewComments, setHideReviewComments] = useState(false);
	const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
	const [replyingToCommentId, setReplyingToCommentId] = useState<number | null>(null);
	const selectingFromRef = useRef<{
		line: number;
		side: "LEFT" | "RIGHT";
	} | null>(null);

	// Expand context & full file view state
	const [expandedLines, setExpandedLines] = useState<Map<number, string[]>>(new Map());
	const [fileContent, setFileContent] = useState<string[] | null>(null);
	const [fullFileTokens, setFullFileTokens] = useState<SyntaxToken[][] | null>(null);
	const [isLoadingExpand, setIsLoadingExpand] = useState<number | null>(null);
	const [showFullFile, setShowFullFile] = useState(false);
	const [isLoadingFullFile, setIsLoadingFullFile] = useState(false);

	// Inline edit state
	const [isEditing, setIsEditing] = useState(false);
	const [editContent, setEditContent] = useState("");
	const [originalEditContent, setOriginalEditContent] = useState("");
	const [baseEditContent, setBaseEditContent] = useState<string | null>(null);
	const [editSha, setEditSha] = useState<string | null>(null);
	const [isLoadingEdit, setIsLoadingEdit] = useState(false);
	const [commitDialogOpen, setCommitDialogOpen] = useState(false);
	const [editTokens, setEditTokens] = useState<SyntaxToken[][] | null>(null);
	const [editView, setEditView] = useState<"edit" | "changes">("edit");
	const editTextareaRef = useRef<HTMLTextAreaElement>(null);
	const editPreRef = useRef<HTMLPreElement>(null);

	// Compute which lines were changed by the PR (new-file line numbers from the patch)
	const prChangedLines = useMemo(() => {
		if (!file.patch) return new Set<number>();
		const diffLines = parseDiffPatch(file.patch);
		const changed = new Set<number>();
		for (const line of diffLines) {
			if (line.type === "add" && line.newLineNumber !== undefined) {
				changed.add(line.newLineNumber);
			}
		}
		return changed;
	}, [file.patch]);

	// Sorted array for prev/next navigation
	const prChangedLinesSorted = useMemo(
		() => Array.from(prChangedLines).sort((a, b) => a - b),
		[prChangedLines],
	);

	// Search state
	const [searchOpen, setSearchOpen] = useState(false);
	const [searchQuery, setSearchQuery] = useState("");
	const [matchCase, setMatchCase] = useState(false);
	const [currentSearchIdx, setCurrentSearchIdx] = useState(-1);
	const searchInputRef = useRef<HTMLInputElement>(null);
	const isHoveringDiffRef = useRef(false);
	const searchMatchesRef = useRef<number[]>([]);

	// Reset search and edit when file changes
	const prevFilenameRef = useRef(file.filename);
	if (prevFilenameRef.current !== file.filename) {
		prevFilenameRef.current = file.filename;
		if (searchOpen) {
			setSearchOpen(false);
			setSearchQuery("");
			setCurrentSearchIdx(-1);
		}
		if (isEditing) {
			setIsEditing(false);
			setEditContent("");
			setOriginalEditContent("");
			setBaseEditContent(null);
			setEditSha(null);
			setEditTokens(null);
			setEditView("edit");
			setCommitDialogOpen(false);
		}
		if (editingDraftId) {
			setEditingDraftId(null);
		}
		if (replyingToCommentId !== null) {
			setReplyingToCommentId(null);
		}
	}

	const draftRepliesByCommentId = useMemo(() => {
		const next = new Map<number, ReviewComment[]>();
		for (const draftReply of draftReplies) {
			if (draftReply.replyToCommentId == null) continue;
			const existing = next.get(draftReply.replyToCommentId) || [];
			existing.push(draftReply);
			next.set(draftReply.replyToCommentId, existing);
		}
		for (const replies of next.values()) {
			replies.sort((left, right) =>
				left.created_at.localeCompare(right.created_at),
			);
		}
		return next;
	}, [draftReplies]);

	// Derive matches (pure computation, no effect needed)
	const searchMatches = useMemo(() => {
		if (!searchOpen || !searchQuery) return [];
		const query = matchCase ? searchQuery : searchQuery.toLowerCase();
		const found: number[] = [];
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].type === "header") continue;
			const content = matchCase
				? lines[i].content
				: lines[i].content.toLowerCase();
			let pos = 0;
			while (true) {
				const idx = content.indexOf(query, pos);
				if (idx === -1) break;
				found.push(i);
				pos = idx + query.length;
			}
		}
		return found;
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchOpen, searchQuery, matchCase, file.patch]);

	// Reset currentSearchIdx when matches change
	if (searchMatches !== searchMatchesRef.current) {
		searchMatchesRef.current = searchMatches;
		const nextIdx = searchMatches.length > 0 ? 0 : -1;
		if (currentSearchIdx !== nextIdx) {
			setCurrentSearchIdx(nextIdx);
		}
	}

	// Highlight matching rows
	useEffect(() => {
		if (!diffContainerRef.current) return;
		diffContainerRef.current.querySelectorAll("tr[data-diff-idx]").forEach((el) => {
			el.classList.remove("diff-search-match", "diff-search-match-active");
		});
		if (searchMatches.length === 0 || currentSearchIdx < 0) return;
		const matchedIndices = new Set(searchMatches);
		for (const idx of matchedIndices) {
			const el = diffContainerRef.current.querySelector(
				`tr[data-diff-idx="${idx}"]`,
			);
			el?.classList.add("diff-search-match");
		}
		const activeIdx = searchMatches[currentSearchIdx];
		if (activeIdx !== undefined) {
			const activeEl = diffContainerRef.current.querySelector(
				`tr[data-diff-idx="${activeIdx}"]`,
			);
			if (activeEl) {
				activeEl.classList.remove("diff-search-match");
				activeEl.classList.add("diff-search-match-active");
				activeEl.scrollIntoView({ block: "center", behavior: "smooth" });
			}
		}
	}, [searchMatches, currentSearchIdx]);

	// Cmd+F intercept
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (
				(e.metaKey || e.ctrlKey) &&
				e.key === "f" &&
				isHoveringDiffRef.current
			) {
				e.preventDefault();
				e.stopPropagation();
				setSearchOpen(true);
				setTimeout(() => searchInputRef.current?.focus(), 0);
			}
		};
		document.addEventListener("keydown", handleKeyDown, true);
		return () => document.removeEventListener("keydown", handleKeyDown, true);
	}, []);

	const closeDiffSearch = useCallback(() => {
		setSearchOpen(false);
		setSearchQuery("");
		setCurrentSearchIdx(-1);
		if (diffContainerRef.current) {
			diffContainerRef.current
				.querySelectorAll("tr[data-diff-idx]")
				.forEach((el) => {
					el.classList.remove(
						"diff-search-match",
						"diff-search-match-active",
					);
				});
		}
	}, []);

	const matchCount = searchMatches.length;

	const goToNextSearch = useCallback(() => {
		if (matchCount === 0) return;
		setCurrentSearchIdx((prev) => (prev + 1) % matchCount);
	}, [matchCount]);

	const goToPrevSearch = useCallback(() => {
		if (matchCount === 0) return;
		setCurrentSearchIdx((prev) => (prev - 1 + matchCount) % matchCount);
	}, [matchCount]);

	const handleDiffSearchKeyDown = useCallback(
		(e: React.KeyboardEvent) => {
			if (e.key === "Escape") {
				closeDiffSearch();
			} else if (e.key === "Enter" && e.shiftKey) {
				e.preventDefault();
				goToPrevSearch();
			} else if (e.key === "Enter") {
				e.preventDefault();
				goToNextSearch();
			}
		},
		[closeDiffSearch, goToNextSearch, goToPrevSearch],
	);

	const fetchFileContent = useCallback(
		async (withHighlight = false): Promise<string[] | null> => {
			if (fileContent && (!withHighlight || fullFileTokens)) return fileContent;
			if (!owner || !repo || !headSha) return null;
			try {
				const url = `/api/file-content?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(file.filename)}&ref=${encodeURIComponent(headSha)}${withHighlight ? "&highlight=true" : ""}`;
				const res = await fetch(url);
				if (!res.ok) return null;
				const data = await res.json();
				const contentLines = (data.content as string).split("\n");
				setFileContent(contentLines);
				if (data.tokens) {
					setFullFileTokens(data.tokens);
				}
				return contentLines;
			} catch {
				return null;
			}
		},
		[fileContent, fullFileTokens, owner, repo, headSha, file.filename],
	);

	const handleStartEdit = useCallback(async () => {
		if (!owner || !repo || !headBranch) return;
		setIsLoadingEdit(true);
		try {
			// Fetch head content (for editing) and base content (for merged diff) in parallel
			const headUrl = `/api/file-content?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(file.filename)}&ref=${encodeURIComponent(headBranch)}&highlight=true`;
			const fetches: Promise<Response>[] = [fetch(headUrl)];
			if (baseSha) {
				const baseUrl = `/api/file-content?owner=${encodeURIComponent(owner)}&repo=${encodeURIComponent(repo)}&path=${encodeURIComponent(file.filename)}&ref=${encodeURIComponent(baseSha)}`;
				fetches.push(fetch(baseUrl));
			}
			const [headRes, baseRes] = await Promise.all(fetches);
			if (!headRes.ok) return;
			const headData = await headRes.json();
			const content = headData.content as string;
			if (content == null) return;
			setEditContent(content);
			setOriginalEditContent(content);
			setEditSha(headData.sha || null);
			setEditTokens(headData.tokens || null);
			setEditView("edit");
			// Base content for merged diff on Changes tab
			if (baseRes?.ok) {
				const baseData = await baseRes.json();
				setBaseEditContent(baseData.content as string);
			} else {
				setBaseEditContent(null);
			}
			setIsEditing(true);
		} catch {
			// fetch or parse error
		} finally {
			setIsLoadingEdit(false);
		}
	}, [owner, repo, headBranch, baseSha, file.filename]);

	const handleCancelEdit = useCallback(() => {
		setIsEditing(false);
		setEditContent("");
		setOriginalEditContent("");
		setBaseEditContent(null);
		setEditSha(null);
		setEditTokens(null);
		setEditView("edit");
	}, []);

	const diffRouter = useRouter();
	const handleCommitEdit = useCallback(
		async (message: string) => {
			if (!owner || !repo || !pullNumber || !headBranch || !editSha) return;
			const result = await commitFileEditOnPR(
				owner,
				repo,
				pullNumber,
				file.filename,
				headBranch,
				editContent,
				editSha,
				message,
			);
			if (result.error) {
				throw new Error(result.error);
			}
			setIsEditing(false);
			setEditContent("");
			setOriginalEditContent("");
			setBaseEditContent(null);
			setEditSha(null);
			setEditTokens(null);
			setEditView("edit");
			emit({
				type: "pr:file-committed",
				owner: owner!,
				repo: repo!,
				number: pullNumber!,
			});
			diffRouter.refresh();
		},
		[
			owner,
			repo,
			pullNumber,
			headBranch,
			editSha,
			editContent,
			file.filename,
			diffRouter,
			emit,
		],
	);

	// Cmd+S to open commit dialog while editing
	useEffect(() => {
		if (!isEditing) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key === "s") {
				e.preventDefault();
				setCommitDialogOpen(true);
			}
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [isEditing]);

	// Sync scroll between textarea and pre overlay
	const handleEditScroll = useCallback(() => {
		if (editTextareaRef.current && editPreRef.current) {
			editPreRef.current.scrollTop = editTextareaRef.current.scrollTop;
			editPreRef.current.scrollLeft = editTextareaRef.current.scrollLeft;
		}
	}, []);

	// Handle textarea input without breaking undo — read from DOM
	const handleEditInput = useCallback(() => {
		if (editTextareaRef.current) {
			const val = editTextareaRef.current.value;
			setEditContent(val);
		}
	}, []);

	// Tab key inserts indentation instead of moving focus
	const handleEditKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Tab") {
			e.preventDefault();
			const ta = e.currentTarget;
			const start = ta.selectionStart;
			const end = ta.selectionEnd;

			if (e.shiftKey) {
				// Shift+Tab: dedent selected lines
				const val = ta.value;
				const lineStart = val.lastIndexOf("\n", start - 1) + 1;
				const lineEnd = end;
				const selectedText = val.slice(lineStart, lineEnd);
				const dedented = selectedText.replace(/^  /gm, "");
				const diff = selectedText.length - dedented.length;

				// Use execCommand to preserve undo
				ta.selectionStart = lineStart;
				ta.selectionEnd = lineEnd;
				document.execCommand("insertText", false, dedented);
				ta.selectionStart = Math.max(
					lineStart,
					start - (start > lineStart ? Math.min(2, diff) : 0),
				);
				ta.selectionEnd = end - diff;
			} else if (start !== end) {
				// Tab with selection: indent all selected lines
				const val = ta.value;
				const lineStart = val.lastIndexOf("\n", start - 1) + 1;
				const selectedText = val.slice(lineStart, end);
				const indented = selectedText.replace(/^/gm, "  ");
				const lineCount = selectedText.split("\n").length;

				ta.selectionStart = lineStart;
				ta.selectionEnd = end;
				document.execCommand("insertText", false, indented);
				ta.selectionStart = start + 2;
				ta.selectionEnd = end + lineCount * 2;
			} else {
				// No selection: insert 2 spaces via execCommand (preserves undo)
				document.execCommand("insertText", false, "  ");
			}
			setEditContent(ta.value);
		}
	}, []);

	// Sync textarea DOM value when editContent changes programmatically (initial load)
	const editContentInitRef = useRef(false);
	useEffect(() => {
		if (isEditing && editTextareaRef.current && !editContentInitRef.current) {
			editTextareaRef.current.value = editContent;
			editContentInitRef.current = true;
		}
		if (!isEditing) editContentInitRef.current = false;
	}, [isEditing, editContent]);

	// Debounced re-tokenization — skip if content matches original (initial load already has tokens)
	const prevEditContentRef = useRef<string>("");
	useEffect(() => {
		if (!isEditing || !editContent) return;
		// Skip re-tokenization if content hasn't changed from what we already have tokens for
		if (editContent === prevEditContentRef.current) return;
		prevEditContentRef.current = editContent;
		// Don't re-fetch on initial load — handleStartEdit already fetched tokens
		if (editContent === originalEditContent && editTokens) return;
		const timer = setTimeout(async () => {
			try {
				const res = await fetch("/api/highlight-code", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						code: editContent,
						filename: file.filename,
					}),
				});
				if (res.ok) {
					const data = await res.json();
					setEditTokens(data.tokens);
				}
			} catch {
				// silently fail — keep stale tokens
			}
		}, 500);
		return () => clearTimeout(timer);
	}, [isEditing, editContent, originalEditContent, editTokens, file.filename]);

	const handleExpandHunk = useCallback(
		async (hunkIdx: number) => {
			setIsLoadingExpand(hunkIdx);
			const content = await fetchFileContent();
			if (!content) {
				setIsLoadingExpand(null);
				return;
			}

			// Find the gap: from end of previous hunk to start of this hunk (in new-file line numbers)
			const currentHunk = hunkInfos.find((h) => h.index === hunkIdx);
			if (!currentHunk) {
				setIsLoadingExpand(null);
				return;
			}

			// Find previous hunk's end
			const prevHunk = hunkInfos.filter((h) => h.index < hunkIdx).pop();
			const gapStart = prevHunk ? prevHunk.endNewLine + 1 : 1;
			const gapEnd = currentHunk.newStart - 1;

			if (gapEnd >= gapStart) {
				// content is 0-indexed, line numbers are 1-indexed
				const expandedContent = content.slice(gapStart - 1, gapEnd);
				setExpandedLines((prev) => {
					const next = new Map(prev);
					next.set(hunkIdx, expandedContent);
					return next;
				});
			}
			setIsLoadingExpand(null);
		},
		[fetchFileContent, hunkInfos],
	);

	const handleToggleFullFile = useCallback(async () => {
		if (showFullFile) {
			setShowFullFile(false);
			return;
		}
		setIsLoadingFullFile(true);
		const content = await fetchFileContent(true);
		setIsLoadingFullFile(false);
		if (content) {
			setShowFullFile(true);
		}
	}, [showFullFile, fetchFileContent]);

	// Index comments by line number for quick lookup
	const commentsByLine = new Map<string, ReviewComment[]>();
	for (const c of fileComments) {
		const lineNum = c.line ?? c.original_line;
		if (lineNum !== null) {
			const key = `${c.side || "RIGHT"}-${lineNum}`;
			const existing = commentsByLine.get(key) || [];
			existing.push(c);
			commentsByLine.set(key, existing);
		}
	}

	const canComment = !!(
		owner &&
		repo &&
		pullNumber &&
		headSha &&
		baseSha &&
		canPersistReviewWorkspace
	);

	// Compute the content of the selected lines for suggestion pre-fill
	const selectedLinesContent = commentRange
		? lines
				.filter((l) => {
					if (l.type === "header") return false;
					if (commentRange.side === "LEFT") {
						// LEFT side = removed lines: match by oldLineNumber
						if (l.type !== "remove") return false;
						const ln = l.oldLineNumber;
						return (
							ln !== undefined &&
							ln >= commentRange.startLine &&
							ln <= commentRange.endLine
						);
					} else {
						// RIGHT side = add/context lines: match by newLineNumber
						if (l.type === "remove") return false;
						const ln = l.newLineNumber;
						return (
							ln !== undefined &&
							ln >= commentRange.startLine &&
							ln <= commentRange.endLine
						);
					}
				})
				.map((l) => l.content)
				.join("\n")
		: "";

	// Compute diff-formatted code for AI context (includes +/- markers)
	const selectedCodeForAI = commentRange
		? (() => {
				const startLine = Math.min(
					commentRange.startLine,
					commentRange.endLine,
				);
				const endLine = Math.max(
					commentRange.startLine,
					commentRange.endLine,
				);
				const isLeft = commentRange.side === "LEFT";

				const matchingLines = lines.filter((l) => {
					if (l.type === "header") return false;
					if (isLeft) {
						if (l.type !== "remove") return false;
						const ln = l.oldLineNumber;
						return (
							ln !== undefined &&
							ln >= startLine &&
							ln <= endLine
						);
					} else {
						if (l.type === "remove") return false;
						const ln = l.newLineNumber;
						return (
							ln !== undefined &&
							ln >= startLine &&
							ln <= endLine
						);
					}
				});

				return matchingLines
					.map((l) => {
						const prefix =
							l.type === "add"
								? "+"
								: l.type === "remove"
									? "-"
									: " ";
						return `${prefix} ${l.content}`;
					})
					.join("\n");
			})()
		: "";

	// Compute highlighted selection range
	const selectionRange =
		selectingFrom && hoverLine !== null
			? {
					start: Math.min(selectingFrom.line, hoverLine),
					end: Math.max(selectingFrom.line, hoverLine),
					side: selectingFrom.side,
				}
			: commentRange
				? {
						start: Math.min(
							commentRange.startLine,
							commentRange.endLine,
						),
						end: Math.max(
							commentRange.startLine,
							commentRange.endLine,
						),
						side: commentRange.side,
					}
				: null;

	const handleLineClick = (lineNum: number, side: "LEFT" | "RIGHT", shiftKey: boolean) => {
		// If we're in a drag selection, ignore click — mouseup already handled it
		if (selectingFromRef.current) return;

		if (shiftKey && commentRange) {
			// Extend existing range with shift+click
			const allLines = [commentRange.startLine, commentRange.endLine, lineNum];
			setCommentRange({
				startLine: Math.min(...allLines),
				endLine: Math.max(...allLines),
				side: commentRange.side,
			});
		} else {
			// Single line comment
			setCommentRange({ startLine: lineNum, endLine: lineNum, side });
		}
	};

	const handleLineMouseDown = (lineNum: number, side: "LEFT" | "RIGHT") => {
		// Start potential drag selection
		selectingFromRef.current = { line: lineNum, side };
		hoverLineRef.current = lineNum;
		setSelectingFrom({ line: lineNum, side });
		setHoverLine(lineNum);

		const handleMouseUp = () => {
			document.removeEventListener("mouseup", handleMouseUp);
			const from = selectingFromRef.current;
			const hover = hoverLineRef.current;
			if (from && hover !== null) {
				const startLine = Math.min(from.line, hover);
				const endLine = Math.max(from.line, hover);
				setCommentRange({ startLine, endLine, side: from.side });
			}
			selectingFromRef.current = null;
			hoverLineRef.current = null;
			setSelectingFrom(null);
			setHoverLine(null);
		};
		document.addEventListener("mouseup", handleMouseUp);
	};

	const handleLineHover = (lineNum: number) => {
		if (selectingFromRef.current) {
			hoverLineRef.current = lineNum;
			setHoverLine(lineNum);
		}
	};

	const navigateToPrevChange = useCallback(
		(allowFileFallback: boolean) => {
			if (isEditing && editView === "edit" && editTextareaRef.current) {
				const cursorPos = editTextareaRef.current.selectionStart;
				const currentLine = editContent
					.slice(0, cursorPos)
					.split("\n").length;
				const previous = [...prChangedLinesSorted]
					.reverse()
					.find((lineNumber) => lineNumber < currentLine);

				if (previous === undefined && allowFileFallback) {
					onPrev();
					return;
				}

				const target =
					previous ??
					prChangedLinesSorted[prChangedLinesSorted.length - 1];
				if (target !== undefined) {
					const container =
						editTextareaRef.current.closest(".overflow-auto");
					const gutterLine = container?.querySelector(
						`[data-edit-line="${target}"]`,
					);
					gutterLine?.scrollIntoView({
						block: "center",
						behavior: "smooth",
					});
					const editorLines = editContent.split("\n");
					const position = editorLines
						.slice(0, target - 1)
						.reduce(
							(sum, lineText) =>
								sum + lineText.length + 1,
							0,
						);
					editTextareaRef.current.focus();
					editTextareaRef.current.setSelectionRange(
						position,
						position,
					);
				}
				return;
			}

			if (!diffContainerRef.current) return;
			const rows = Array.from(
				diffContainerRef.current.querySelectorAll<HTMLElement>(
					"tr.diff-add-row",
				),
			);
			if (rows.length === 0) return;

			const containerRect = diffContainerRef.current.getBoundingClientRect();
			const centerY = containerRect.top + containerRect.height / 2;
			let target: HTMLElement | null = null;

			for (let rowIndex = rows.length - 1; rowIndex >= 0; rowIndex--) {
				if (rows[rowIndex].getBoundingClientRect().top < centerY - 10) {
					target = rows[rowIndex];
					break;
				}
			}

			if (!target && allowFileFallback) {
				onPrev();
				return;
			}

			const resolvedTarget = target ?? rows[rows.length - 1];
			resolvedTarget.scrollIntoView({
				block: "center",
				behavior: "smooth",
			});
			resolvedTarget.classList.add("!brightness-125");
			setTimeout(() => resolvedTarget.classList.remove("!brightness-125"), 1000);
		},
		[editContent, editView, isEditing, onPrev, prChangedLinesSorted],
	);

	const navigateToNextChange = useCallback(
		(allowFileFallback: boolean) => {
			if (isEditing && editView === "edit" && editTextareaRef.current) {
				const cursorPos = editTextareaRef.current.selectionStart;
				const currentLine = editContent
					.slice(0, cursorPos)
					.split("\n").length;
				const next = prChangedLinesSorted.find(
					(lineNumber) => lineNumber > currentLine,
				);

				if (next === undefined && allowFileFallback) {
					onNext();
					return;
				}

				const target = next ?? prChangedLinesSorted[0];
				if (target !== undefined) {
					const container =
						editTextareaRef.current.closest(".overflow-auto");
					const gutterLine = container?.querySelector(
						`[data-edit-line="${target}"]`,
					);
					gutterLine?.scrollIntoView({
						block: "center",
						behavior: "smooth",
					});
					const editorLines = editContent.split("\n");
					const position = editorLines
						.slice(0, target - 1)
						.reduce(
							(sum, lineText) =>
								sum + lineText.length + 1,
							0,
						);
					editTextareaRef.current.focus();
					editTextareaRef.current.setSelectionRange(
						position,
						position,
					);
				}
				return;
			}

			if (!diffContainerRef.current) return;
			const rows = Array.from(
				diffContainerRef.current.querySelectorAll<HTMLElement>(
					"tr.diff-add-row",
				),
			);
			if (rows.length === 0) return;

			const containerRect = diffContainerRef.current.getBoundingClientRect();
			const centerY = containerRect.top + containerRect.height / 2;
			const target = rows.find(
				(row) => row.getBoundingClientRect().top > centerY + 10,
			);

			if (!target && allowFileFallback) {
				onNext();
				return;
			}

			const resolvedTarget = target ?? rows[0];
			resolvedTarget.scrollIntoView({
				block: "center",
				behavior: "smooth",
			});
			resolvedTarget.classList.add("!brightness-125");
			setTimeout(() => resolvedTarget.classList.remove("!brightness-125"), 1000);
		},
		[editContent, editView, isEditing, onNext, prChangedLinesSorted],
	);

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (
				event.defaultPrevented ||
				event.metaKey ||
				event.ctrlKey ||
				event.altKey ||
				isEditableKeyTarget(event.target)
			) {
				return;
			}

			if (event.key === "j") {
				event.preventDefault();
				navigateToNextChange(true);
			} else if (event.key === "k") {
				event.preventDefault();
				navigateToPrevChange(true);
			}
		};

		document.addEventListener("keydown", handleKeyDown);
		return () => document.removeEventListener("keydown", handleKeyDown);
	}, [navigateToNextChange, navigateToPrevChange]);

	return (
		<div
			className="flex flex-col flex-1 min-h-0 min-w-0"
			onMouseEnter={() => {
				isHoveringDiffRef.current = true;
			}}
			onMouseLeave={() => {
				isHoveringDiffRef.current = false;
			}}
		>
			<FileReviewHeader
				file={file}
				sidebarCollapsed={sidebarCollapsed}
				onToggleSidebar={onToggleSidebar}
				viewed={viewed}
				onToggleViewed={onToggleViewed}
				disableViewedToggle={!canToggleViewed}
				viewedToggleTitle={
					canToggleViewed
						? viewed
							? "Mark as unreviewed"
							: "Mark as reviewed"
						: "Sign in to persist viewed state"
				}
				canWrite={canWrite}
				headBranch={headBranch}
				isEditing={isEditing}
				editView={editView}
				onEditViewChange={setEditView}
				onCancelEdit={handleCancelEdit}
				onSaveEdit={() => setCommitDialogOpen(true)}
				onStartEdit={handleStartEdit}
				isLoadingEdit={isLoadingEdit}
				showFullFile={showFullFile}
				isLoadingFullFile={isLoadingFullFile}
				onToggleFullFile={handleToggleFullFile}
				showChangeNavigation={
					(isEditing || showFullFile) &&
					prChangedLinesSorted.length > 0
				}
				onPrevChange={() => navigateToPrevChange(false)}
				onNextChange={() => navigateToNextChange(false)}
				disableChangeNavigation={isEditing && editView !== "edit"}
				fileCommentCount={fileComments.length}
				hideReviewComments={hideReviewComments}
				onToggleHideReviewComments={() =>
					setHideReviewComments((value) => !value)
				}
				splitView={splitView}
				onToggleSplit={onToggleSplit}
				wordWrap={wordWrap}
				onToggleWrap={onToggleWrap}
				index={index}
				total={total}
				onPrevFile={onPrev}
				onNextFile={onNext}
				searchOpen={searchOpen}
				searchQuery={searchQuery}
				searchMatchCount={searchMatches.length}
				currentSearchIndex={currentSearchIdx}
				searchInputRef={searchInputRef}
				onSearchQueryChange={setSearchQuery}
				onSearchKeyDown={handleDiffSearchKeyDown}
				onPrevSearch={goToPrevSearch}
				onNextSearch={goToNextSearch}
				matchCase={matchCase}
				onToggleMatchCase={() => setMatchCase(!matchCase)}
				onCloseSearch={closeDiffSearch}
			/>

			{/* Scrollable diff content */}
			<div
				ref={diffContainerRef}
				className={cn(
					"flex-1 overflow-y-auto overscroll-contain",
					wordWrap ? "overflow-x-hidden" : "overflow-x-auto",
				)}
			>
				{isEditing ? (
					<>
						{/* Editor — always mounted to preserve undo history */}
						<div
							className={cn(
								"flex flex-1 min-h-0 overflow-auto",
								editView !== "edit" && "hidden",
							)}
						>
							{/* Line numbers gutter with PR change markers */}
							<div className="shrink-0 select-none text-right border-r border-border/50 pt-4 pb-4 sticky left-0 bg-code-bg z-[1]">
								{editContent
									.split("\n")
									.map((_, i) => {
										const lineNum =
											i + 1;
										const isPrChanged =
											prChangedLines.has(
												lineNum,
											);
										return (
											<div
												key={
													i
												}
												data-edit-line={
													lineNum
												}
												className={cn(
													"text-[12.5px] leading-[20px] font-mono h-[20px] pr-2 pl-2 flex items-center justify-end gap-1",
													isPrChanged
														? "text-muted-foreground/60"
														: "text-muted-foreground",
													isPrChanged &&
														"bg-diff-add-bg",
												)}
											>
												{isPrChanged && (
													<span className="w-[3px] h-3 rounded-full bg-success/60 shrink-0" />
												)}
												{
													lineNum
												}
											</div>
										);
									})}
							</div>
							{/* Code area: relative container with pre + absolute textarea overlay */}
							<div className="flex-1 relative min-h-[400px]">
								<pre
									ref={editPreRef}
									className={cn(
										"pointer-events-none font-mono text-[12.5px] leading-[20px] p-4 overflow-hidden m-0 diff-syntax",
										wordWrap
											? "whitespace-pre-wrap break-words"
											: "whitespace-pre",
									)}
									aria-hidden="true"
									style={{ tabSize: 2 }}
								>
									{editTokens
										? editContent
												.split(
													"\n",
												)
												.map(
													(
														lineText,
														lineIdx,
													) => {
														const tokens =
															editTokens[
																lineIdx
															];
														return (
															<React.Fragment
																key={
																	lineIdx
																}
															>
																{tokens
																	? tokens.map(
																			(
																				t,
																				ti,
																			) => (
																				<span
																					key={
																						ti
																					}
																					style={{
																						color: `light-dark(${t.lightColor}, ${t.darkColor})`,
																					}}
																				>
																					{
																						t.text
																					}
																				</span>
																			),
																		)
																	: lineText}
																{
																	"\n"
																}
															</React.Fragment>
														);
													},
												)
										: editContent}
								</pre>
								<textarea
									ref={editTextareaRef}
									defaultValue={editContent}
									onInput={handleEditInput}
									onKeyDown={
										handleEditKeyDown
									}
									onScroll={handleEditScroll}
									className={cn(
										"absolute inset-0 w-full h-full bg-transparent font-mono text-[12.5px] leading-[20px] p-4 outline-none resize-none border-none m-0",
										wordWrap
											? "whitespace-pre-wrap break-words"
											: "whitespace-pre",
									)}
									style={{
										tabSize: 2,
										color: "transparent",
										caretColor: "var(--foreground)",
										WebkitTextFillColor:
											"transparent",
									}}
									spellCheck={false}
									autoFocus
								/>
							</div>
						</div>
						{/* Changes view — merged diff (base → edited content), same style as full file view */}
						{editView === "changes" && (
							<div className="flex-1 overflow-auto">
								{(() => {
									const diffBase =
										baseEditContent ??
										originalEditContent;
									const noChanges =
										editContent ===
										diffBase;
									if (noChanges) {
										return (
											<div className="px-4 py-16 text-center">
												<p className="text-[11px] text-muted-foreground/50 font-mono">
													No
													changes
												</p>
											</div>
										);
									}
									const diffEntries =
										computeLineDiff(
											diffBase,
											editContent,
										);
									return (
										<table
											className={cn(
												"w-full border-collapse",
												wordWrap &&
													"table-fixed",
											)}
										>
											{wordWrap && (
												<colgroup>
													<col className="w-[3px]" />
													<col className="w-10" />
													<col />
												</colgroup>
											)}
											<tbody>
												{diffEntries.map(
													(
														entry,
														i,
													) => {
														const isGapSeparator =
															entry.type ===
																"context" &&
															entry.content ===
																"···";
														if (
															isGapSeparator
														) {
															return (
																<tr
																	key={
																		i
																	}
																>
																	<td
																		colSpan={
																			3
																		}
																		className="py-1.5 text-center text-[11px] font-mono text-muted-foreground/30 bg-secondary/20 border-y border-border/30"
																	>
																		<UnfoldVertical className="w-3 h-3 inline-block mr-1 opacity-50" />
																	</td>
																</tr>
															);
														}
														const isAdd =
															entry.type ===
															"add";
														const isDel =
															entry.type ===
															"remove";
														return (
															<tr
																key={
																	i
																}
																className={cn(
																	isAdd &&
																		"diff-add-row",
																	isDel &&
																		"diff-del-row",
																)}
															>
																{/* Gutter bar */}
																<td
																	className={cn(
																		"w-[3px] p-0 sticky left-0 z-[1]",
																		isAdd
																			? "bg-success"
																			: isDel
																				? "bg-destructive"
																				: "",
																	)}
																/>
																{/* Line number */}
																<td
																	className={cn(
																		"w-10 py-0 pr-2 text-right text-[11px] font-mono select-none border-r border-border/40 sticky left-[3px] z-[1]",
																		isAdd
																			? "bg-diff-add-gutter text-diff-add-gutter"
																			: isDel
																				? "bg-diff-del-gutter text-diff-del-gutter"
																				: "text-muted-foreground/30",
																	)}
																>
																	{isAdd
																		? entry.newLineNumber
																		: isDel
																			? entry.oldLineNumber
																			: entry.newLineNumber}
																</td>
																{/* Content */}
																<td
																	className={cn(
																		"py-0 font-mono text-[12.5px] leading-[20px]",
																		wordWrap
																			? "whitespace-pre-wrap break-words"
																			: "whitespace-pre",
																		isAdd &&
																			"bg-diff-add-bg",
																		isDel &&
																			"bg-diff-del-bg",
																	)}
																>
																	<div className="flex">
																		<span
																			className={cn(
																				"inline-block w-5 text-center shrink-0 select-none",
																				isAdd
																					? "text-success/50"
																					: isDel
																						? "text-destructive/50"
																						: "text-transparent",
																			)}
																		>
																			{isAdd
																				? "+"
																				: isDel
																					? "-"
																					: " "}
																		</span>
																		<span className="pl-1">
																			<span
																				className={cn(
																					isAdd &&
																						"text-diff-add-text",
																					isDel &&
																						"text-diff-del-text",
																				)}
																			>
																				{
																					entry.content
																				}
																			</span>
																		</span>
																	</div>
																</td>
															</tr>
														);
													},
												)}
											</tbody>
										</table>
									);
								})()}
							</div>
						)}
					</>
				) : showFullFile && fileContent ? (
					<FullFileView
						fileContent={fileContent}
						lines={lines}
						hunkInfos={hunkInfos}
						wordWrap={wordWrap}
						fileHighlightData={fileHighlightData}
						fullFileTokens={fullFileTokens}
					/>
				) : lines.length > 0 ? (
					<DiffViewport
						model={diffViewportModel}
						splitView={splitView}
						wordWrap={wordWrap}
						canComment={canComment}
						commentsByLine={commentsByLine}
						commentRange={commentRange}
						selectionRange={selectionRange}
						fileHighlightData={fileHighlightData}
						highlightLines={highlightLines}
						expandedLines={expandedLines}
						isLoadingExpand={isLoadingExpand}
						onExpandHunk={handleExpandHunk}
						onLineClick={handleLineClick}
						onLineMouseDown={handleLineMouseDown}
						onLineHover={handleLineHover}
						selectedLinesContent={selectedLinesContent}
						selectedCodeForAI={selectedCodeForAI}
						hideComments={hideReviewComments}
						renderInlineComment={(comment) => {
							const commentId =
								typeof comment.id === "number"
									? comment.id
									: Number.NaN;
							const childDraftReplies = Number.isFinite(
								commentId,
							)
								? draftRepliesByCommentId.get(
										commentId,
									) || []
								: [];
							const isEditingDraft =
								comment.isDraft &&
								editingDraftId ===
									String(comment.id);
							const isReplyFormOpen =
								!comment.isDraft &&
								Number.isFinite(commentId) &&
								replyingToCommentId === commentId;

							if (isEditingDraft) {
								return (
									<InlineCommentForm
										owner={owner!}
										repo={repo!}
										pullNumber={
											pullNumber!
										}
										headSha={headSha!}
										baseSha={baseSha!}
										reviewFile={{
											filename: file.filename,
											status: file.status,
											additions: file.additions,
											deletions: file.deletions,
											patch: file.patch,
											previousFilename:
												file.previous_filename ??
												null,
										}}
										filename={
											file.filename
										}
										line={
											comment.line ??
											comment.original_line ??
											1
										}
										side={
											(comment.side ??
												"RIGHT") as
												| "LEFT"
												| "RIGHT"
										}
										startLine={
											comment.start_line ??
											comment.line ??
											comment.original_line ??
											undefined
										}
										selectedLinesContent={
											comment
												.suggestions?.[0]
												?.originalCode
										}
										onClose={() =>
											setEditingDraftId(
												null,
											)
										}
										onAddContext={
											onAddContext
										}
										participants={
											participants
										}
										draftComment={
											comment
										}
									/>
								);
							}

							return (
								<InlineCommentDisplay
									comment={comment}
									owner={owner}
									repo={repo}
									pullNumber={pullNumber}
									headBranch={headBranch}
									filename={file.filename}
									canWrite={canWrite}
									canPersistDrafts={
										canPersistReviewWorkspace
									}
									onEditDraft={(draftId) =>
										setEditingDraftId(
											draftId,
										)
									}
									onDeleteDraft={() => {
										setEditingDraftId(
											null,
										);
										setReplyingToCommentId(
											null,
										);
									}}
									onStartReply={() => {
										if (
											!Number.isFinite(
												commentId,
											)
										)
											return;
										setReplyingToCommentId(
											(
												currentId,
											) =>
												currentId ===
												commentId
													? null
													: commentId,
										);
									}}
									draftReplies={
										childDraftReplies
									}
									replyForm={
										isReplyFormOpen ? (
											<InlineCommentForm
												owner={
													owner!
												}
												repo={
													repo!
												}
												pullNumber={
													pullNumber!
												}
												headSha={
													headSha!
												}
												baseSha={
													baseSha!
												}
												reviewFile={{
													filename: file.filename,
													status: file.status,
													additions: file.additions,
													deletions: file.deletions,
													patch: file.patch,
													previousFilename:
														file.previous_filename ??
														null,
												}}
												filename={
													file.filename
												}
												line={
													comment.line ??
													comment.original_line ??
													1
												}
												side={
													(comment.side ??
														"RIGHT") as
														| "LEFT"
														| "RIGHT"
												}
												startLine={
													comment.start_line ??
													comment.line ??
													comment.original_line ??
													undefined
												}
												onClose={() =>
													setReplyingToCommentId(
														null,
													)
												}
												onAddContext={
													onAddContext
												}
												participants={
													participants
												}
												replyToCommentId={
													commentId
												}
											/>
										) : null
									}
								/>
							);
						}}
						renderCommentForm={({
							line,
							side,
							startLine,
							selectedLinesContent: content,
							selectedCodeForAI: codeForAI,
						}) => (
							<InlineCommentForm
								owner={owner!}
								repo={repo!}
								pullNumber={pullNumber!}
								headSha={headSha!}
								baseSha={baseSha!}
								reviewFile={{
									filename: file.filename,
									status: file.status,
									additions: file.additions,
									deletions: file.deletions,
									patch: file.patch,
									previousFilename:
										file.previous_filename ??
										null,
								}}
								filename={file.filename}
								line={line}
								side={side}
								startLine={startLine}
								selectedLinesContent={content}
								selectedCodeForAI={codeForAI}
								onClose={() => {
									setCommentRange(null);
									setSelectingFrom(null);
									setHoverLine(null);
								}}
								onAddContext={onAddContext}
								participants={participants}
							/>
						)}
					/>
				) : (
					<div className="px-4 py-16 text-center">
						<File className="w-5 h-5 text-muted-foreground/30 mx-auto mb-2" />
						<p className="text-[11px] text-muted-foreground/50 font-mono">
							{file.status === "renamed"
								? "File renamed without changes"
								: "Binary file or no diff available"}
						</p>
					</div>
				)}
			</div>

			{/* Commit dialog for inline edits */}
			{isEditing && headBranch && (
				<CommitDialog
					open={commitDialogOpen}
					onOpenChange={setCommitDialogOpen}
					filename={file.filename}
					branch={headBranch}
					originalContent={originalEditContent}
					newContent={editContent}
					onCommit={handleCommitEdit}
				/>
			)}
		</div>
	);
}

export function InlineCommentForm({
	owner,
	repo,
	pullNumber,
	headSha,
	baseSha,
	reviewFile,
	filename,
	line,
	side,
	startLine,
	selectedLinesContent,
	selectedCodeForAI,
	onClose,
	onAddContext,
	participants,
	draftComment,
	replyToCommentId,
}: {
	owner: string;
	repo: string;
	pullNumber: number;
	headSha: string;
	baseSha?: string;
	reviewFile?: {
		filename: string;
		status: string;
		additions: number;
		deletions: number;
		patch?: string;
		previousFilename?: string | null;
	};
	filename: string;
	line: number;
	side: "LEFT" | "RIGHT";
	startLine?: number;
	selectedLinesContent?: string;
	selectedCodeForAI?: string;
	onClose: () => void;
	onAddContext?: AddContextCallback;
	participants?: Array<{ login: string; avatar_url: string }>;
	draftComment?: ReviewComment;
	replyToCommentId?: number;
}) {
	const router = useRouter();
	const [body, setBody] = useState(draftComment?.body ?? "");
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const editorRef = useRef<MarkdownEditorRef>(null);
	const effectiveStartLine = startLine ?? line;
	const isEditingDraft = !!draftComment?.isDraft;
	const isReply = replyToCommentId != null || draftComment?.replyToCommentId != null;

	const isMultiLine = startLine !== undefined && startLine !== line;

	useEffect(() => {
		setBody(draftComment?.body ?? "");
		setError(null);
	}, [draftComment?.body, draftComment?.id]);

	const handleInsertSuggestion = () => {
		const suggestionSeed =
			selectedLinesContent ??
			draftComment?.suggestions?.[0]?.originalCode ??
			(reviewFile
				? (getPRReviewClientRangeContent(
						reviewFile,
						effectiveStartLine,
						line,
						side,
					) ?? "")
				: "");
		const suggestion = `\`\`\`suggestion\n${suggestionSeed}\n\`\`\``;
		if (!body) {
			setBody(suggestion);
		} else {
			setBody(body + "\n" + suggestion);
		}
		setTimeout(() => editorRef.current?.focus(), 0);
	};

	const handleSubmit = () => {
		if (!body.trim()) return;
		setError(null);
		startTransition(async () => {
			if (!baseSha) {
				setError("Missing base commit for this review draft.");
				return;
			}

			const trimmedBody = body.trim();
			const parsedSuggestion = parseSuggestionBlock(trimmedBody);
			const originalCode =
				draftComment?.suggestions?.[0]?.originalCode ??
				selectedLinesContent ??
				(reviewFile
					? getPRReviewClientRangeContent(
							reviewFile,
							effectiveStartLine,
							line,
							side,
						)
					: null);

			if (parsedSuggestion && side !== "RIGHT") {
				setError(
					"Suggestions can only be staged on the modified side of the diff.",
				);
				return;
			}

			if (parsedSuggestion && !originalCode) {
				setError(
					"Could not capture the original code for this suggestion.",
				);
				return;
			}

			const lineFingerprint =
				reviewFile != null
					? await buildPRReviewClientLineFingerprint({
							file: reviewFile,
							startLine: effectiveStartLine,
							endLine: line,
							side,
						})
					: null;

			const originalFingerprint =
				draftComment?.suggestions?.[0]?.originalFingerprint ??
				(reviewFile != null
					? await buildPRReviewClientLineFingerprint({
							file: reviewFile,
							startLine: effectiveStartLine,
							endLine: line,
							side,
						})
					: null);

			if (parsedSuggestion && !originalFingerprint) {
				setError("Could not fingerprint this suggestion range.");
				return;
			}

			const suggestionInputs =
				parsedSuggestion && originalFingerprint
					? [
							{
								path: filename,
								side,
								startLine: effectiveStartLine,
								endLine: line,
								originalCode: originalCode ?? "",
								suggestedCode:
									parsedSuggestion.suggestion,
								originalFingerprint,
								status: "draft" as const,
							},
						]
					: [];

			const res = await upsertPRReviewDraftCommentAction({
				id:
					isEditingDraft && typeof draftComment?.id === "string"
						? draftComment.id
						: undefined,
				owner,
				repo,
				pullNumber,
				headSha,
				baseSha,
				path: filename,
				side,
				startLine: effectiveStartLine,
				endLine: line,
				lineFingerprint,
				body: trimmedBody,
				replyToCommentId:
					replyToCommentId ?? draftComment?.replyToCommentId ?? null,
				status: "active",
				suggestions: suggestionInputs,
			});
			if (!("success" in res && res.success)) {
				setError(
					"error" in res ? res.error : "Failed to save draft comment",
				);
			} else {
				onClose();
				router.refresh();
			}
		});
	};

	return (
		<div className="mx-3 my-1.5 max-w-xl rounded-lg border border-border bg-background overflow-hidden shadow-sm">
			{(isMultiLine || isReply || isEditingDraft) && (
				<div className="px-3 py-1 bg-muted/20 border-b border-border/40">
					{isMultiLine ? (
						<span className="text-[10px] font-mono text-muted-foreground/60">
							Lines {startLine}–{line}
						</span>
					) : (
						<span className="text-[10px] font-mono text-muted-foreground/60">
							Line {line}
						</span>
					)}
					{isReply && (
						<span className="ml-2 text-[10px] font-mono text-info/70">
							Draft reply
						</span>
					)}
					{isEditingDraft && !isReply && (
						<span className="ml-2 text-[10px] font-mono text-muted-foreground/60">
							Editing draft
						</span>
					)}
				</div>
			)}

			<MarkdownEditor
				ref={editorRef}
				value={body}
				onChange={setBody}
				placeholder="Leave a comment..."
				rows={5}
				autoFocus
				compact
				participants={participants}
				owner={owner}
				className="border-0 rounded-none focus-within:border-0 focus-within:ring-0"
				onKeyDown={(e) => {
					if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
						e.preventDefault();
						handleSubmit();
					}
					if (e.key === "Escape") {
						onClose();
					}
				}}
			/>

			{error && <p className="text-[10px] text-destructive px-3 pb-1">{error}</p>}

			{/* Bottom bar */}
			<div className="flex items-center gap-1 px-2 py-1.5 border-t border-border/60">
				{/* Suggest button */}
				{side === "RIGHT" && (
					<button
						onClick={handleInsertSuggestion}
						className={cn(
							"flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors cursor-pointer",
							"text-muted-foreground/50 hover:text-foreground hover:bg-accent/60",
						)}
						title="Suggest a code change"
					>
						Insert suggestion
					</button>
				)}

				{/* Ask Ghost button */}
				{onAddContext && (
					<button
						onClick={() => {
							onAddContext({
								filename,
								startLine: startLine ?? line,
								endLine: line,
								selectedCode:
									selectedCodeForAI ||
									selectedLinesContent ||
									"",
								side,
							});
						}}
						className={cn(
							"flex items-center gap-1 px-2 py-1 rounded-md text-[10px] transition-colors cursor-pointer",
							"text-muted-foreground/50 hover:text-foreground hover:bg-accent/60",
						)}
						title="Add code context to Ghost"
					>
						<Ghost className="w-3.5 h-3.5" />
						Add to Ghost
					</button>
				)}

				<div className="flex-1" />

				{/* Cancel */}
				<button
					onClick={onClose}
					disabled={isPending}
					className="px-2 py-1 text-[10px] text-muted-foreground/60 hover:text-foreground rounded-md transition-colors cursor-pointer disabled:opacity-40"
				>
					Cancel
				</button>

				{/* Submit */}
				<button
					onClick={handleSubmit}
					disabled={isPending || !body.trim()}
					className={cn(
						"flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-md text-[10px] font-medium transition-all cursor-pointer",
						body.trim()
							? "bg-foreground text-background hover:bg-foreground/90"
							: "bg-muted text-muted-foreground",
						"disabled:opacity-40 disabled:cursor-not-allowed",
					)}
				>
					{isPending ? (
						<Loader2 className="w-3 h-3 animate-spin" />
					) : (
						<>
							{isReply
								? "Save reply"
								: isEditingDraft
									? "Save draft"
									: "Add to review"}
							<CornerDownLeft className="w-3 h-3 opacity-50" />
						</>
					)}
				</button>
			</div>
		</div>
	);
}

/** Renders an inline review comment with suggestion support */
function InlineCommentDisplay({
	comment,
	owner,
	repo,
	pullNumber,
	headBranch,
	filename,
	canWrite = true,
	canPersistDrafts = false,
	onEditDraft,
	onDeleteDraft,
	onStartReply,
	draftReplies = [],
	replyForm,
}: {
	comment: ReviewComment;
	owner?: string;
	repo?: string;
	pullNumber?: number;
	headBranch?: string;
	filename: string;
	canWrite?: boolean;
	canPersistDrafts?: boolean;
	onEditDraft?: (draftId: string) => void;
	onDeleteDraft?: () => void;
	onStartReply?: () => void;
	draftReplies?: ReviewComment[];
	replyForm?: React.ReactNode;
}) {
	const router = useRouter();
	const parsed = parseSuggestionBlock(comment.body);
	const [collapsed, setCollapsed] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [isDeletingDraft, startDeletingDraft] = useTransition();
	const draftSuggestion = comment.suggestions?.[0] ?? null;
	const isDraft = !!comment.isDraft;

	const handleDeleteDraft = () => {
		const draftId = typeof comment.id === "string" ? comment.id : null;
		if (!isDraft || !draftId || !owner || !repo || !pullNumber) {
			return;
		}

		setError(null);
		startDeletingDraft(async () => {
			const result = await deletePRReviewDraftCommentAction(
				owner,
				repo,
				pullNumber,
				draftId,
			);
			if (!("success" in result && result.success)) {
				setError(
					"error" in result
						? result.error
						: "Failed to delete draft comment",
				);
				return;
			}

			onDeleteDraft?.();
			router.refresh();
		});
	};

	return (
		<div className="mx-3 my-1.5 border border-border rounded-lg bg-muted/40">
			<div
				className="flex items-center gap-1.5 px-3 py-1.5 cursor-pointer select-none hover:bg-muted/50 transition-colors rounded-t-lg"
				onClick={() => setCollapsed((c) => !c)}
			>
				<ChevronDown
					className={cn(
						"w-3 h-3 shrink-0 text-muted-foreground transition-transform",
						collapsed && "-rotate-90",
					)}
				/>
				{comment.user ? (
					<UserTooltip username={comment.user.login}>
						<Link
							href={`/users/${comment.user.login}`}
							className="flex items-center gap-1.5 text-xs font-medium text-foreground/70 hover:text-foreground transition-colors"
							onClick={(e) => e.stopPropagation()}
						>
							<GithubAvatar
								src={comment.user.avatar_url}
								alt={comment.user.login}
								size={16}
								className="rounded-full"
							/>
							<span className="hover:underline">
								{comment.user.login}
							</span>
						</Link>
					</UserTooltip>
				) : (
					<div className="flex items-center gap-1.5">
						<span className="text-xs font-medium text-foreground/70">
							{isDraft ? "Draft" : "ghost"}
						</span>
						{isDraft && (
							<span className="rounded-full bg-info/10 px-1.5 py-0.5 text-[9px] font-mono text-info">
								Private
							</span>
						)}
						{comment.isStale && (
							<span className="rounded-full bg-warning/10 px-1.5 py-0.5 text-[9px] font-mono text-warning">
								Stale
							</span>
						)}
					</div>
				)}
				<span className="text-[10px] text-muted-foreground/50">
					<TimeAgo date={comment.created_at} />
				</span>
				{collapsed && (
					<span className="text-[10px] text-muted-foreground/50 truncate flex-1 min-w-0">
						{comment.body.slice(0, 60)}
						{comment.body.length > 60 ? "..." : ""}
					</span>
				)}
			</div>

			{(!collapsed || replyForm != null) && (
				<>
					{draftSuggestion ? (
						<SuggestionBlock
							commentId={comment.id}
							before={parsed?.before}
							suggestion={draftSuggestion.suggestedCode}
							after={parsed?.after}
							owner={owner}
							repo={repo}
							pullNumber={pullNumber}
							headBranch={headBranch}
							filename={filename}
							line={comment.line}
							startLine={comment.start_line}
							canWrite={canWrite}
							draftSuggestion={draftSuggestion}
						/>
					) : parsed ? (
						<SuggestionBlock
							commentId={comment.id}
							before={parsed.before}
							suggestion={parsed.suggestion}
							after={parsed.after}
							owner={owner}
							repo={repo}
							pullNumber={pullNumber}
							headBranch={headBranch}
							filename={filename}
							line={comment.line}
							startLine={comment.start_line}
							canWrite={canWrite}
						/>
					) : (
						<div className="px-3 py-2 text-sm text-foreground/70">
							<ClientMarkdown content={comment.body} />
						</div>
					)}
					<div className="flex items-center gap-2 border-t border-border/40 px-3 py-1.5">
						{isDraft ? (
							<>
								<button
									onClick={(event) => {
										event.stopPropagation();
										if (
											typeof comment.id ===
											"string"
										) {
											onEditDraft?.(
												comment.id,
											);
										}
									}}
									className="text-[10px] font-mono text-muted-foreground/60 transition-colors hover:text-foreground cursor-pointer"
								>
									Edit
								</button>
								<button
									onClick={(event) => {
										event.stopPropagation();
										handleDeleteDraft();
									}}
									disabled={isDeletingDraft}
									className="text-[10px] font-mono text-muted-foreground/60 transition-colors hover:text-destructive cursor-pointer disabled:opacity-40"
								>
									{isDeletingDraft
										? "Deleting..."
										: "Discard"}
								</button>
							</>
						) : (
							canPersistDrafts && (
								<button
									onClick={(event) => {
										event.stopPropagation();
										onStartReply?.();
									}}
									className="text-[10px] font-mono text-muted-foreground/60 transition-colors hover:text-foreground cursor-pointer"
								>
									Reply
								</button>
							)
						)}
					</div>
					{error && (
						<p className="px-3 pb-2 text-[10px] text-destructive">
							{error}
						</p>
					)}
					{draftReplies.length > 0 && (
						<div className="border-t border-border/40 px-2 py-2">
							<div className="space-y-2">
								{draftReplies.map((reply) => (
									<InlineCommentDisplay
										key={reply.id}
										comment={reply}
										owner={owner}
										repo={repo}
										pullNumber={
											pullNumber
										}
										headBranch={
											headBranch
										}
										filename={filename}
										canWrite={canWrite}
										canPersistDrafts={
											canPersistDrafts
										}
										onEditDraft={
											onEditDraft
										}
										onDeleteDraft={
											onDeleteDraft
										}
									/>
								))}
							</div>
						</div>
					)}
					{replyForm}
				</>
			)}
		</div>
	);
}

/** Full file view: shows entire file with diff changes highlighted inline */
function FullFileView({
	fileContent,
	lines,
	hunkInfos,
	wordWrap,
	fileHighlightData,
	fullFileTokens,
}: {
	fileContent: string[];
	lines: DiffLine[];
	hunkInfos: {
		index: number;
		newStart: number;
		newCount: number;
		endNewLine: number;
	}[];
	wordWrap: boolean;
	fileHighlightData?: Record<string, SyntaxToken[]>;
	fullFileTokens?: SyntaxToken[][] | null;
}) {
	// Build a merged view: walk through the file content line by line,
	// inserting diff add/remove lines where they belong.

	// Collect changed line info from the diff
	const addedNewLines = new Set<number>(); // new-file line numbers that are additions
	const removedByNewLine = new Map<number, DiffLine[]>(); // removed lines keyed by the new-file line they precede
	const contextHighlight = new Map<
		number,
		{ tokens?: SyntaxToken[]; segments?: DiffSegment[] }
	>();

	// Walk hunks to map removed lines to their position in the new file
	for (let hi = 0; hi < hunkInfos.length; hi++) {
		const hunk = hunkInfos[hi];
		// Find diff lines belonging to this hunk
		const hunkDiffStart = hunk.index + 1; // skip the header
		const hunkDiffEnd =
			hi + 1 < hunkInfos.length ? hunkInfos[hi + 1].index : lines.length;

		let newLineTracker = hunk.newStart;
		const pendingRemoves: DiffLine[] = [];

		for (let li = hunkDiffStart; li < hunkDiffEnd; li++) {
			const dl = lines[li];
			if (dl.type === "remove") {
				pendingRemoves.push(dl);
			} else if (dl.type === "add") {
				addedNewLines.add(newLineTracker);
				// Attach pending removes to this add line
				if (pendingRemoves.length > 0) {
					const existing = removedByNewLine.get(newLineTracker) || [];
					existing.push(...pendingRemoves);
					removedByNewLine.set(newLineTracker, existing);
					pendingRemoves.length = 0;
				}
				// Store syntax tokens for add lines
				if (fileHighlightData) {
					contextHighlight.set(newLineTracker, {
						tokens: fileHighlightData[`A-${newLineTracker}`],
						segments: dl.segments,
					});
				}
				newLineTracker++;
			} else if (dl.type === "context") {
				// Flush pending removes before this context line
				if (pendingRemoves.length > 0) {
					const existing = removedByNewLine.get(newLineTracker) || [];
					existing.push(...pendingRemoves);
					removedByNewLine.set(newLineTracker, existing);
					pendingRemoves.length = 0;
				}
				// Store syntax tokens for context lines
				if (fileHighlightData) {
					contextHighlight.set(newLineTracker, {
						tokens: fileHighlightData[`C-${newLineTracker}`],
					});
				}
				newLineTracker++;
			}
		}
		// Remaining removes at end of hunk — attach to the line after the hunk
		if (pendingRemoves.length > 0) {
			const afterLine = newLineTracker;
			const existing = removedByNewLine.get(afterLine) || [];
			existing.push(...pendingRemoves);
			removedByNewLine.set(afterLine, existing);
		}
	}

	// Build merged rows
	type MergedRow =
		| {
				kind: "normal";
				lineNum: number;
				content: string;
				isAdd: boolean;
				tokens?: SyntaxToken[];
				segments?: DiffSegment[];
		  }
		| {
				kind: "removed";
				oldLineNum: number;
				content: string;
				tokens?: SyntaxToken[];
				segments?: DiffSegment[];
		  };

	const mergedRows: MergedRow[] = [];

	for (let i = 0; i < fileContent.length; i++) {
		const lineNum = i + 1;

		// Insert removed lines that precede this new-file line
		const removes = removedByNewLine.get(lineNum);
		if (removes) {
			for (const rm of removes) {
				mergedRows.push({
					kind: "removed",
					oldLineNum: rm.oldLineNumber ?? 0,
					content: rm.content,
					tokens: fileHighlightData?.[`R-${rm.oldLineNumber}`],
					segments: rm.segments,
				});
			}
		}

		const isAdd = addedNewLines.has(lineNum);
		const highlight = contextHighlight.get(lineNum);

		mergedRows.push({
			kind: "normal",
			lineNum,
			content: fileContent[i],
			isAdd,
			tokens: highlight?.tokens ?? fullFileTokens?.[i] ?? undefined,
			segments: highlight?.segments,
		});
	}

	// Handle removes that come after the last line
	const afterEnd = fileContent.length + 1;
	const trailingRemoves = removedByNewLine.get(afterEnd);
	if (trailingRemoves) {
		for (const rm of trailingRemoves) {
			mergedRows.push({
				kind: "removed",
				oldLineNum: rm.oldLineNumber ?? 0,
				content: rm.content,
				tokens: fileHighlightData?.[`R-${rm.oldLineNumber}`],
				segments: rm.segments,
			});
		}
	}

	return (
		<table className={cn("w-full border-collapse", wordWrap && "table-fixed")}>
			{wordWrap && (
				<colgroup>
					<col className="w-[3px]" />
					<col className="w-10" />
					<col />
				</colgroup>
			)}
			<tbody>
				{mergedRows.map((row, i) => {
					if (row.kind === "removed") {
						return (
							<tr
								key={`rm-${i}`}
								className="diff-del-row"
							>
								<td className="w-[3px] p-0 sticky left-0 z-[1] bg-destructive" />
								<td className="w-10 py-0 pr-2 text-right text-[11px] font-mono text-diff-del-gutter select-none border-r border-border/40 sticky left-[3px] z-[1] bg-diff-del-gutter" />
								<td
									className={cn(
										"py-0 font-mono text-[12.5px] leading-[20px] bg-diff-del-bg",
										wordWrap
											? "whitespace-pre-wrap break-words"
											: "whitespace-pre",
									)}
								>
									<div className="flex">
										<span className="inline-block w-5 text-center shrink-0 select-none text-destructive/50">
											-
										</span>
										<span className="pl-1">
											{row.tokens ? (
												row.segments ? (
													<SyntaxSegmentedContent
														segments={
															row.segments
														}
														tokens={
															row.tokens
														}
														type="remove"
													/>
												) : (
													<span className="diff-syntax">
														{row.tokens.map(
															(
																t,
																ti,
															) => (
																<span
																	key={
																		ti
																	}
																	style={{
																		color: `light-dark(${t.lightColor}, ${t.darkColor})`,
																	}}
																>
																	{
																		t.text
																	}
																</span>
															),
														)}
													</span>
												)
											) : (
												<span className="text-diff-del-text">
													{
														row.content
													}
												</span>
											)}
										</span>
									</div>
								</td>
							</tr>
						);
					}

					const isAdd = row.isAdd;
					return (
						<tr
							key={`ln-${i}`}
							className={
								isAdd ? "diff-add-row" : undefined
							}
						>
							<td
								className={cn(
									"w-[3px] p-0 sticky left-0 z-[1]",
									isAdd && "bg-success",
								)}
							/>
							<td
								className={cn(
									"w-10 py-0 pr-2 text-right text-[11px] font-mono select-none border-r border-border/40 sticky left-[3px] z-[1]",
									isAdd
										? "bg-diff-add-gutter text-diff-add-gutter"
										: "text-muted-foreground/30",
								)}
							>
								{row.lineNum}
							</td>
							<td
								className={cn(
									"py-0 font-mono text-[12.5px] leading-[20px]",
									wordWrap
										? "whitespace-pre-wrap break-words"
										: "whitespace-pre",
									isAdd && "bg-diff-add-bg",
								)}
							>
								<div className="flex">
									<span
										className={cn(
											"inline-block w-5 text-center shrink-0 select-none",
											isAdd
												? "text-success/50"
												: "text-transparent",
										)}
									>
										{isAdd ? "+" : " "}
									</span>
									<span className="pl-1">
										{row.tokens ? (
											row.segments ? (
												<SyntaxSegmentedContent
													segments={
														row.segments
													}
													tokens={
														row.tokens
													}
													type={
														isAdd
															? "add"
															: "context"
													}
												/>
											) : (
												<span className="diff-syntax">
													{row.tokens.map(
														(
															t,
															ti,
														) => (
															<span
																key={
																	ti
																}
																style={{
																	color: `light-dark(${t.lightColor}, ${t.darkColor})`,
																}}
															>
																{
																	t.text
																}
															</span>
														),
													)}
												</span>
											)
										) : (
											<span
												className={
													isAdd
														? "text-diff-add-text"
														: ""
												}
											>
												{
													row.content
												}
											</span>
										)}
									</span>
								</div>
							</td>
						</tr>
					);
				})}
			</tbody>
		</table>
	);
}

function SidebarCommits({
	commits,
	owner,
	repo,
	checkStatus,
}: {
	commits: PRCommit[];
	owner?: string;
	repo?: string;
	checkStatus?: CheckStatus;
}) {
	const [commitStatuses, setCommitStatuses] = useState<Map<string, CheckStatus>>(new Map());
	const [loadingStatuses, setLoadingStatuses] = useState(false);

	// Fetch check status for all commits when the component mounts
	useEffect(() => {
		if (!owner || !repo || commits.length === 0) return;

		let cancelled = false;
		setLoadingStatuses(true);

		async function fetchAll() {
			const results = new Map<string, CheckStatus>();
			// Fetch in parallel, but limit concurrency
			const batch = commits.map(async (c) => {
				try {
					const res = await fetch(
						`/api/check-status?owner=${encodeURIComponent(owner!)}&repo=${encodeURIComponent(repo!)}&ref=${encodeURIComponent(c.sha)}`,
					);
					if (res.ok) {
						const data = await res.json();
						if (data && data.state) {
							results.set(c.sha, data as CheckStatus);
						}
					}
				} catch {
					// ignore individual failures
				}
			});
			await Promise.all(batch);
			if (!cancelled) {
				setCommitStatuses(results);
				setLoadingStatuses(false);
			}
		}

		fetchAll();
		return () => {
			cancelled = true;
		};
	}, [owner, repo, commits]);

	if (commits.length === 0) {
		return (
			<div className="px-3 py-8 text-center">
				<GitCommitHorizontal className="w-4 h-4 mx-auto mb-2 text-muted-foreground/30" />
				<p className="text-[11px] text-muted-foreground/50 font-mono">
					No commits
				</p>
			</div>
		);
	}

	return (
		<div>
			{/* Head commit CI status summary */}
			{checkStatus && (
				<div className="px-3 py-2 border-b border-border/40 flex items-center gap-2">
					<span className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-wider">
						CI / CD
					</span>
					<div className="ml-auto">
						<CheckStatusBadge
							checkStatus={checkStatus}
							align="right"
							usePortal
							owner={owner}
							repo={repo}
						/>
					</div>
				</div>
			)}

			{loadingStatuses && (
				<div className="px-3 py-1.5 flex items-center gap-1.5">
					<Loader2 className="w-2.5 h-2.5 animate-spin text-muted-foreground" />
					<span className="text-[9px] font-mono text-muted-foreground">
						Loading check statuses...
					</span>
				</div>
			)}

			<div className="space-y-0.5">
				{commits.map((c) => {
					const shortSha = c.sha.slice(0, 7);
					const message = c.commit.message.split("\n")[0];
					const date = c.commit.author?.date;
					const commitUrl =
						owner && repo
							? `/${owner}/${repo}/commits/${c.sha}`
							: undefined;
					const commitCheck = commitStatuses.get(c.sha);

					return (
						<div
							key={c.sha}
							className="px-3 py-1.5 hover:bg-muted/50 transition-colors"
						>
							<div className="flex items-start gap-1.5">
								{c.author && (
									<GithubAvatar
										src={
											c.author
												.avatar_url
										}
										alt={c.author.login}
										size={16}
										className="rounded-full mt-0.5 shrink-0"
									/>
								)}
								<div className="flex-1 min-w-0">
									{commitUrl ? (
										<Link
											href={
												commitUrl
											}
											className="text-[11px] font-mono text-foreground/80 hover:text-foreground hover:underline line-clamp-2 break-words block"
										>
											{message}
										</Link>
									) : (
										<span className="text-[11px] font-mono text-foreground/80 line-clamp-2 break-words block">
											{message}
										</span>
									)}
									<div className="flex items-center gap-1.5 mt-0.5">
										<span className="text-[9px] font-mono text-info/70 flex items-center gap-1">
											{shortSha}
											{c.commit
												.verification
												?.verified && (
												<span className="inline-flex items-center px-1 rounded-sm border border-success/30 bg-success/10 text-success">
													<span className="text-[8px] font-bold">
														Verified
													</span>
												</span>
											)}
										</span>
										{c.author && (
											<span className="text-[9px] text-muted-foreground/50 truncate">
												{
													c
														.author
														.login
												}
											</span>
										)}
										{commitCheck && (
											<span className="shrink-0">
												<CheckStatusBadge
													checkStatus={
														commitCheck
													}
													align="right"
													usePortal
													owner={
														owner
													}
													repo={
														repo
													}
												/>
											</span>
										)}
										{date && (
											<span className="text-[9px] text-muted-foreground ml-auto shrink-0">
												<TimeAgo
													date={
														date
													}
												/>
											</span>
										)}
									</div>
								</div>
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function SidebarReviews({
	files,
	threadsByFile,
	reviewSummaries,
	onNavigateToFile,
	owner,
	repo,
	pullNumber,
}: {
	files: DiffFile[];
	threadsByFile: Map<string, ReviewThread[]>;
	reviewSummaries: ReviewSummary[];
	onNavigateToFile: (index: number, line?: number | null) => void;
	owner?: string;
	repo?: string;
	pullNumber?: number;
}) {
	const router = useRouter();
	const { emit } = useMutationEvents();
	const [expandedFiles, setExpandedFiles] = useState<Set<string>>(
		() => new Set(threadsByFile.keys()),
	);

	const toggleFile = (path: string) => {
		setExpandedFiles((prev) => {
			const next = new Set(prev);
			if (next.has(path)) next.delete(path);
			else next.add(path);
			return next;
		});
	};

	const threadGroups = files
		.map((f, i) => ({
			filePath: f.filename,
			fileIndex: i,
			threads: threadsByFile.get(f.filename) || [],
		}))
		.filter((group) => group.threads.length > 0);

	if (threadGroups.length === 0) {
		return (
			<div className="px-3 py-8 text-center">
				<MessageSquare className="w-4 h-4 mx-auto mb-2 text-muted-foreground/30" />
				<p className="text-[11px] text-muted-foreground/50 font-mono">
					No review threads
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-0.5">
			{/* Review summaries */}
			{reviewSummaries.length > 0 && (
				<div className="px-3 py-1.5 space-y-1">
					{reviewSummaries.map((r) => (
						<div
							key={r.id}
							className="flex items-center gap-1.5"
						>
							{r.user && (
								<GithubAvatar
									src={r.user.avatar_url}
									alt={r.user.login}
									size={14}
									className="rounded-full"
								/>
							)}
							<span className="text-[10px] text-muted-foreground/70 truncate">
								{r.user?.login || "ghost"}
							</span>
							<ReviewStateBadge state={r.state} />
						</div>
					))}
				</div>
			)}

			<ReviewThreadList
				groups={threadGroups}
				variant="sidebar"
				isFileExpanded={(path) => expandedFiles.has(path)}
				onToggleFile={toggleFile}
				owner={owner}
				repo={repo}
				pullNumber={pullNumber}
				onNavigateToFile={onNavigateToFile}
				onThreadMutated={(_, resolved) => {
					if (!owner || !repo || !pullNumber) return;
					emit({
						type: resolved
							? "pr:thread-resolved"
							: "pr:thread-unresolved",
						owner,
						repo,
						number: pullNumber,
					});
					router.refresh();
				}}
			/>
		</div>
	);
}

interface LineDiffEntry {
	type: "context" | "add" | "remove";
	content: string;
	oldLineNumber?: number;
	newLineNumber?: number;
}

function computeLineDiff(oldText: string, newText: string): LineDiffEntry[] {
	const oldLines = oldText.split("\n");
	const newLines = newText.split("\n");
	const n = oldLines.length;
	const m = newLines.length;

	// LCS via DP
	const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
	for (let i = 1; i <= n; i++) {
		for (let j = 1; j <= m; j++) {
			dp[i][j] =
				oldLines[i - 1] === newLines[j - 1]
					? dp[i - 1][j - 1] + 1
					: Math.max(dp[i - 1][j], dp[i][j - 1]);
		}
	}

	// Backtrack to get diff ops
	const ops: LineDiffEntry[] = [];
	let i = n,
		j = m;
	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
			ops.push({
				type: "context",
				content: oldLines[i - 1],
				oldLineNumber: i,
				newLineNumber: j,
			});
			i--;
			j--;
		} else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
			ops.push({ type: "add", content: newLines[j - 1], newLineNumber: j });
			j--;
		} else {
			ops.push({ type: "remove", content: oldLines[i - 1], oldLineNumber: i });
			i--;
		}
	}
	ops.reverse();

	// Collapse into hunks with 3 lines of context
	const CONTEXT = 3;
	const changeIndices: number[] = [];
	for (let k = 0; k < ops.length; k++) {
		if (ops[k].type !== "context") changeIndices.push(k);
	}
	if (changeIndices.length === 0) return [];

	const includeSet = new Set<number>();
	for (const ci of changeIndices) {
		for (
			let k = Math.max(0, ci - CONTEXT);
			k <= Math.min(ops.length - 1, ci + CONTEXT);
			k++
		) {
			includeSet.add(k);
		}
	}

	const result: LineDiffEntry[] = [];
	const sortedIndices = Array.from(includeSet).sort((a, b) => a - b);
	for (let k = 0; k < sortedIndices.length; k++) {
		if (k > 0 && sortedIndices[k] - sortedIndices[k - 1] > 1) {
			// Gap separator
			result.push({ type: "context", content: "···" });
		}
		result.push(ops[sortedIndices[k]]);
	}

	return result;
}
