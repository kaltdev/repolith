import crypto from "node:crypto";
import { parseDiffPatch } from "./github-utils";
import type { PRReviewDiffFile, PRReviewSide } from "./pr-review-types";

function sha256Hex(value: string): string {
	return crypto.createHash("sha256").update(value).digest("hex");
}

export function buildPRReviewFingerprint(parts: readonly string[]): string {
	return sha256Hex(parts.join("\u0000"));
}

export function buildPRReviewFileFingerprint(file: PRReviewDiffFile): string {
	return buildPRReviewFingerprint([
		file.filename,
		file.previousFilename ?? "",
		file.status,
		String(file.additions),
		String(file.deletions),
		file.patch ?? "",
	]);
}

export function getPRReviewRangeContent(
	file: Pick<PRReviewDiffFile, "filename" | "patch">,
	startLine: number,
	endLine: number,
	side: PRReviewSide,
): string | null {
	if (!file.patch || startLine <= 0 || endLine < startLine) return null;

	const lines = parseDiffPatch(file.patch).filter((line) => line.type !== "header");
	const selected = lines.filter((line) => {
		const lineNumber = side === "LEFT" ? line.oldLineNumber : line.newLineNumber;
		return lineNumber !== undefined && lineNumber >= startLine && lineNumber <= endLine;
	});

	if (selected.length === 0) return null;
	return selected.map((line) => line.content).join("\n");
}

export function buildPRReviewLineFingerprint({
	file,
	startLine,
	endLine,
	side,
}: {
	file: PRReviewDiffFile;
	startLine: number;
	endLine: number;
	side: PRReviewSide;
}): string | null {
	const selectedContent = getPRReviewRangeContent(file, startLine, endLine, side);
	if (selectedContent == null) return null;

	return buildPRReviewFingerprint([
		buildPRReviewFileFingerprint(file),
		file.filename,
		side,
		String(startLine),
		String(endLine),
		selectedContent,
	]);
}

export function buildPRReviewChecklistFingerprint({
	key,
	evidence,
}: {
	key: string;
	evidence: ReadonlyArray<{ path: string; detail?: string }>;
}): string {
	const normalizedEvidence = [...evidence]
		.map((item) => `${item.path}:${item.detail ?? ""}`)
		.sort();

	return buildPRReviewFingerprint([key, ...normalizedEvidence]);
}
