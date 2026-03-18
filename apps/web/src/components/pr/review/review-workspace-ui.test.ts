import { describe, expect, it } from "vitest";
import type { ReviewThread } from "@/lib/github";
import {
	applyPRReviewChecklistToggleAction,
	applyPRReviewViewedFileAction,
	buildPRReviewViewerPreferences,
	buildVisiblePRReviewFiles,
	getActiveViewedFilePaths,
} from "./review-workspace-ui";

describe("buildPRReviewViewerPreferences", () => {
	it("prefers workspace settings over local diff preferences", () => {
		expect(
			buildPRReviewViewerPreferences(
				{
					hideViewedFiles: true,
					splitView: true,
					wordWrap: false,
					defaultViewMode: "flat",
					fontSize: "lg",
					showFolderDiffCount: false,
				},
				{
					splitView: false,
					wordWrap: true,
					defaultViewMode: "tree",
					fontSize: "sm",
					showFolderDiffCount: true,
				},
			),
		).toEqual({
			hideViewedFiles: true,
			splitView: true,
			wordWrap: false,
			defaultViewMode: "flat",
			fontSize: "lg",
			showFolderDiffCount: false,
		});
	});

	it("falls back to local preferences when workspace values are unset", () => {
		expect(
			buildPRReviewViewerPreferences(null, {
				splitView: true,
				wordWrap: false,
				defaultViewMode: "flat",
				fontSize: "md",
				showFolderDiffCount: false,
			}),
		).toEqual({
			hideViewedFiles: false,
			splitView: true,
			wordWrap: false,
			defaultViewMode: "flat",
			fontSize: "md",
			showFolderDiffCount: false,
		});
	});
});

describe("getActiveViewedFilePaths", () => {
	it("drops stale viewed file state", () => {
		expect(
			getActiveViewedFilePaths([
				{ path: "a.ts", viewed: true, isStale: false },
				{ path: "b.ts", viewed: true, isStale: true },
				{ path: "c.ts", viewed: false, isStale: false },
			]),
		).toEqual(["a.ts"]);
	});
});

describe("applyPRReviewViewedFileAction", () => {
	it("adds and removes viewed paths deterministically", () => {
		expect(
			applyPRReviewViewedFileAction(["a.ts"], {
				paths: ["b.ts", "a.ts"],
				viewed: true,
			}),
		).toEqual(["a.ts", "b.ts"]);

		expect(
			applyPRReviewViewedFileAction(["a.ts", "b.ts"], {
				paths: ["a.ts"],
				viewed: false,
			}),
		).toEqual(["b.ts"]);
	});
});

describe("applyPRReviewChecklistToggleAction", () => {
	it("updates only the targeted checklist item", () => {
		const items = [
			{
				key: "tests",
				label: "Tests",
				reason: "x",
				evidence: [],
				fingerprint: "1",
				checked: false,
				persisted: false,
				isStaleState: false,
				updatedAt: null,
			},
			{
				key: "docs",
				label: "Docs",
				reason: "y",
				evidence: [],
				fingerprint: "2",
				checked: false,
				persisted: false,
				isStaleState: false,
				updatedAt: null,
			},
		];

		expect(
			applyPRReviewChecklistToggleAction(items, {
				itemKey: "docs",
				checked: true,
				persisted: true,
				isStaleState: false,
				updatedAt: "2026-03-18T00:00:00.000Z",
			}),
		).toMatchObject([
			{ key: "tests", checked: false },
			{
				key: "docs",
				checked: true,
				persisted: true,
				updatedAt: "2026-03-18T00:00:00.000Z",
			},
		]);
	});
});

describe("buildVisiblePRReviewFiles", () => {
	it("hides viewed files unless they are active or unresolved", () => {
		const files = [
			{ filename: "src/a.ts" },
			{ filename: "src/b.ts" },
			{ filename: "src/c.ts" },
		];
		const threadsByFile = new Map<string, ReviewThread[]>([
			[
				"src/b.ts",
				[
					{
						id: "t1",
						isResolved: false,
						isOutdated: false,
						path: "src/b.ts",
						line: 1,
						startLine: 1,
						diffSide: "RIGHT",
						resolvedBy: null,
						comments: [],
					},
				],
			],
		]);

		expect(
			buildVisiblePRReviewFiles(files, {
				hideViewedFiles: true,
				viewedFiles: new Set(["src/a.ts", "src/b.ts"]),
				activeFilename: "src/a.ts",
				threadsByFile,
			}),
		).toEqual([
			{ filename: "src/a.ts" },
			{ filename: "src/b.ts" },
			{ filename: "src/c.ts" },
		]);

		expect(
			buildVisiblePRReviewFiles(files, {
				hideViewedFiles: true,
				viewedFiles: new Set(["src/a.ts", "src/b.ts"]),
				activeFilename: "src/c.ts",
				threadsByFile,
			}),
		).toEqual([{ filename: "src/b.ts" }, { filename: "src/c.ts" }]);
	});
});
