import type { DiffFontSize, DiffPreferences, DiffViewMode } from "@/lib/diff-preferences";
import type { ReviewThread } from "@/lib/github";
import type {
	PRReviewChecklistItemState,
	PRReviewFileState,
	PRReviewWorkspace,
} from "@/lib/pr-review-types";

export interface PRReviewViewerPreferences {
	hideViewedFiles: boolean;
	splitView: boolean;
	wordWrap: boolean;
	defaultViewMode: DiffViewMode;
	fontSize: DiffFontSize;
	showFolderDiffCount: boolean;
}

export interface PRReviewChecklistToggleAction {
	itemKey: string;
	checked: boolean;
	updatedAt?: string | null;
	persisted?: boolean;
	isStaleState?: boolean;
}

export interface PRReviewViewedFileAction {
	paths: string[];
	viewed: boolean;
}

export function buildPRReviewViewerPreferences(
	workspace: Pick<
		PRReviewWorkspace,
		| "hideViewedFiles"
		| "splitView"
		| "wordWrap"
		| "defaultViewMode"
		| "fontSize"
		| "showFolderDiffCount"
	> | null,
	localPreferences: DiffPreferences,
): PRReviewViewerPreferences {
	return {
		hideViewedFiles: workspace?.hideViewedFiles ?? false,
		splitView: workspace?.splitView ?? localPreferences.splitView,
		wordWrap: workspace?.wordWrap ?? localPreferences.wordWrap,
		defaultViewMode:
			(workspace?.defaultViewMode as DiffViewMode | null) ??
			localPreferences.defaultViewMode,
		fontSize: (workspace?.fontSize as DiffFontSize | null) ?? localPreferences.fontSize,
		showFolderDiffCount:
			workspace?.showFolderDiffCount ?? localPreferences.showFolderDiffCount,
	};
}

export function getActiveViewedFilePaths(
	fileStates: ReadonlyArray<Pick<PRReviewFileState, "path" | "viewed" | "isStale">>,
): string[] {
	return fileStates
		.filter((state) => state.viewed && !state.isStale)
		.map((state) => state.path)
		.sort((left, right) => left.localeCompare(right));
}

export function applyPRReviewViewedFileAction(
	currentPaths: readonly string[],
	action: PRReviewViewedFileAction,
): string[] {
	const next = new Set(currentPaths);

	for (const path of action.paths) {
		if (action.viewed) {
			next.add(path);
		} else {
			next.delete(path);
		}
	}

	return [...next].sort((left, right) => left.localeCompare(right));
}

export function applyPRReviewChecklistToggleAction(
	currentItems: readonly PRReviewChecklistItemState[],
	action: PRReviewChecklistToggleAction,
): PRReviewChecklistItemState[] {
	return currentItems.map((item) =>
		item.key === action.itemKey
			? {
					...item,
					checked: action.checked,
					persisted: action.persisted ?? item.persisted,
					isStaleState: action.isStaleState ?? item.isStaleState,
					updatedAt:
						action.updatedAt === undefined
							? item.updatedAt
							: action.updatedAt,
				}
			: item,
	);
}

export function buildVisiblePRReviewFiles<T extends { filename: string }>(
	files: readonly T[],
	options: {
		hideViewedFiles: boolean;
		viewedFiles: ReadonlySet<string>;
		activeFilename?: string | null;
		threadsByFile?: ReadonlyMap<string, ReviewThread[]>;
	},
): T[] {
	if (!options.hideViewedFiles) {
		return [...files];
	}

	return files.filter((file) => {
		if (!options.viewedFiles.has(file.filename)) {
			return true;
		}

		if (options.activeFilename === file.filename) {
			return true;
		}

		const hasUnresolvedThread =
			options.threadsByFile
				?.get(file.filename)
				?.some((thread) => !thread.isResolved) ?? false;

		return hasUnresolvedThread;
	});
}
