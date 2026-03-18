import { parseDiffPatch } from "./github-utils";
import type { PRReviewDiffFile, PRReviewSide } from "./pr-review-types";

async function sha256Hex(value: string): Promise<string> {
	const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));

	return Array.from(new Uint8Array(digest))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

export async function buildPRReviewClientFingerprint(parts: readonly string[]): Promise<string> {
	return sha256Hex(parts.join("\u0000"));
}

export async function buildPRReviewClientFileFingerprint(file: PRReviewDiffFile): Promise<string> {
	return buildPRReviewClientFingerprint([
		file.filename,
		file.previousFilename ?? "",
		file.status,
		String(file.additions),
		String(file.deletions),
		file.patch ?? "",
	]);
}

export function getPRReviewClientRangeContent(
	file: Pick<PRReviewDiffFile, "patch">,
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

export async function buildPRReviewClientLineFingerprint({
	file,
	startLine,
	endLine,
	side,
}: {
	file: PRReviewDiffFile;
	startLine: number;
	endLine: number;
	side: PRReviewSide;
}): Promise<string | null> {
	const selectedContent = getPRReviewClientRangeContent(file, startLine, endLine, side);
	if (selectedContent == null) return null;

	return buildPRReviewClientFingerprint([
		await buildPRReviewClientFileFingerprint(file),
		file.filename,
		side,
		String(startLine),
		String(endLine),
		selectedContent,
	]);
}
