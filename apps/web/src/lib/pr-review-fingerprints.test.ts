import { describe, expect, it } from "vitest";
import {
	buildPRReviewFileFingerprint,
	buildPRReviewLineFingerprint,
	getPRReviewRangeContent,
} from "./pr-review-fingerprints";
import type { PRReviewDiffFile } from "./pr-review-types";

const SAMPLE_FILE: PRReviewDiffFile = {
	filename: "apps/web/src/example.ts",
	status: "modified",
	additions: 2,
	deletions: 1,
	patch: [
		"@@ -1,3 +1,4 @@",
		" export function sum(a: number, b: number) {",
		"-\treturn a + b;",
		"+\tconst total = a + b;",
		"+\treturn total;",
		" }",
	].join("\n"),
};

describe("PR review fingerprints", () => {
	it("changes the file fingerprint when the patch changes", () => {
		const baseline = buildPRReviewFileFingerprint(SAMPLE_FILE);
		const changed = buildPRReviewFileFingerprint({
			...SAMPLE_FILE,
			patch: `${SAMPLE_FILE.patch}\n+console.log(total);`,
		});

		expect(changed).not.toBe(baseline);
	});

	it("extracts range content for the requested side", () => {
		expect(getPRReviewRangeContent(SAMPLE_FILE, 2, 3, "RIGHT")).toBe(
			"\tconst total = a + b;\n\treturn total;",
		);

		expect(getPRReviewRangeContent(SAMPLE_FILE, 2, 2, "LEFT")).toBe("\treturn a + b;");
	});

	it("builds different line fingerprints for different sides or ranges", () => {
		const rightRange = buildPRReviewLineFingerprint({
			file: SAMPLE_FILE,
			startLine: 2,
			endLine: 3,
			side: "RIGHT",
		});
		const leftRange = buildPRReviewLineFingerprint({
			file: SAMPLE_FILE,
			startLine: 2,
			endLine: 2,
			side: "LEFT",
		});

		expect(rightRange).toBeTruthy();
		expect(leftRange).toBeTruthy();
		expect(rightRange).not.toBe(leftRange);
	});
});
