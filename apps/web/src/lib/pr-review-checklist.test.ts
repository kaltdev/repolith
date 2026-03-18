import { describe, expect, it } from "vitest";
import { generatePRReviewChecklist } from "./pr-review-checklist";
import type { PRReviewDiffFile } from "./pr-review-types";

describe("PR review checklist generation", () => {
	it("adds a tests item when application code changes without obvious tests", () => {
		const files: PRReviewDiffFile[] = [
			{
				filename: "apps/web/src/lib/math.ts",
				status: "modified",
				additions: 4,
				deletions: 1,
				patch: "@@ -1 +1 @@\n-export const one = 1;\n+export const one = 2;",
			},
		];

		const items = generatePRReviewChecklist(files);
		const testsItem = items.find((item) => item.key === "tests");

		expect(testsItem).toBeTruthy();
		expect(testsItem?.reason).toContain("without obvious test-file updates");
	});

	it("adds docs and config items for docs and schema changes", () => {
		const files: PRReviewDiffFile[] = [
			{
				filename: "docs/api.md",
				status: "modified",
				additions: 6,
				deletions: 2,
				patch: "@@ -1 +1 @@\n-old\n+new",
			},
			{
				filename: "apps/web/prisma/schema.prisma",
				status: "modified",
				additions: 3,
				deletions: 1,
				patch: "@@ -1 +1 @@\n-model Old {}\n+model New {}",
			},
		];

		const items = generatePRReviewChecklist(files);

		expect(items.some((item) => item.key === "docs")).toBe(true);
		expect(items.some((item) => item.key === "config-env")).toBe(true);
	});

	it("adds a breaking-changes item when exported contracts change", () => {
		const files: PRReviewDiffFile[] = [
			{
				filename: "packages/sdk/src/index.ts",
				status: "modified",
				additions: 2,
				deletions: 2,
				patch: [
					"@@ -1,2 +1,2 @@",
					"-export interface ClientOptions { retries: number }",
					"+export interface ClientOptions { retries: number; timeoutMs: number }",
				].join("\n"),
			},
		];

		const items = generatePRReviewChecklist(files);
		const breakingItem = items.find((item) => item.key === "breaking-changes");

		expect(breakingItem).toBeTruthy();
		expect(breakingItem?.evidence[0]?.path).toBe("packages/sdk/src/index.ts");
	});
});
