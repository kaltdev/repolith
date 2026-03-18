import {
	buildPRReviewChecklistFingerprint,
	buildPRReviewFingerprint,
} from "./pr-review-fingerprints";
import type {
	PRReviewChecklistEvidence,
	PRReviewChecklistItem,
	PRReviewDiffFile,
} from "./pr-review-types";

const TEST_FILE_RE =
	/(^|\/)(__tests__|tests?)\/|(\.|-)(test|spec)\.(c|m)?[jt]sx?$|(\.|-)test\.py$/i;
const DOC_FILE_RE =
	/(^|\/)(docs?|documentation)\/|(^|\/)(readme|changelog|contributing|migration)\.md$/i;
const ENV_FILE_RE = /(^|\/)\.env(\..+)?$/i;
const WORKFLOW_RE = /^\.github\/workflows\/.+\.ya?ml$/i;
const CONFIG_FILE_RE =
	/(^|\/)(docker-compose|compose)\.ya?ml$|(^|\/)(next|tailwind|postcss|vitest|vite|eslint|prettier|tsconfig|oxlint)(\.config)?\.[^.]+$|(^|\/)package(-lock)?\.json$|(^|\/)bun\.lockb?$/i;

function normalizePath(path: string): string {
	return path.replace(/^\.?\//, "").trim();
}

function buildEvidence(path: string, detail?: string): PRReviewChecklistEvidence {
	return {
		kind: "file",
		path,
		...(detail ? { detail } : {}),
	};
}

function isTestFile(path: string): boolean {
	return TEST_FILE_RE.test(normalizePath(path));
}

function isDocFile(path: string): boolean {
	const normalized = normalizePath(path);
	return (
		DOC_FILE_RE.test(normalized) ||
		normalized.endsWith(".md") ||
		normalized.endsWith(".mdx")
	);
}

function isConfigOrEnvFile(path: string): boolean {
	const normalized = normalizePath(path);
	return (
		ENV_FILE_RE.test(normalized) ||
		WORKFLOW_RE.test(normalized) ||
		CONFIG_FILE_RE.test(normalized) ||
		normalized === "apps/web/prisma/schema.prisma" ||
		normalized.startsWith("apps/web/prisma/migrations/") ||
		normalized.endsWith("/schema.prisma") ||
		normalized.includes("/migrations/")
	);
}

function isCodeFile(path: string): boolean {
	const normalized = normalizePath(path).toLowerCase();
	if (isTestFile(normalized) || isDocFile(normalized) || isConfigOrEnvFile(normalized)) {
		return false;
	}
	return /\.(c|m)?[jt]sx?$|\.py$|\.rb$|\.go$|\.rs$|\.java$|\.kt$|\.swift$|\.php$|\.scala$|\.sh$/.test(
		normalized,
	);
}

function looksLikeBreakingPatch(file: PRReviewDiffFile): boolean {
	if (!file.patch) return false;

	const signatureChangeRe =
		/^[+-]\s*export\s+(async\s+function|function|class|type|interface|enum|const)\b/m;
	const apiContractRe = /^[+-]\s*(GET|POST|PUT|PATCH|DELETE)\s*\(/m;
	const schemaContractRe = /^[+-]\s*(model|enum|type)\s+\w+/m;

	return (
		signatureChangeRe.test(file.patch) ||
		apiContractRe.test(file.patch) ||
		schemaContractRe.test(file.patch)
	);
}

function isBreakingSurfaceFile(path: string): boolean {
	const normalized = normalizePath(path);
	return (
		normalized.startsWith("src/lib/") ||
		normalized.includes("/src/lib/") ||
		normalized.startsWith("packages/") ||
		normalized.includes("/packages/") ||
		normalized.endsWith("/route.ts") ||
		normalized.endsWith(".d.ts") ||
		normalized.endsWith("schema.prisma")
	);
}

function dedupeEvidence(evidence: PRReviewChecklistEvidence[]): PRReviewChecklistEvidence[] {
	const seen = new Set<string>();
	const result: PRReviewChecklistEvidence[] = [];

	for (const item of evidence) {
		const key = buildPRReviewFingerprint([item.kind, item.path, item.detail ?? ""]);
		if (seen.has(key)) continue;
		seen.add(key);
		result.push(item);
	}

	return result.sort((a, b) => a.path.localeCompare(b.path));
}

export function generatePRReviewChecklist(files: PRReviewDiffFile[]): PRReviewChecklistItem[] {
	const normalizedFiles = files.map((file) => ({
		...file,
		filename: normalizePath(file.filename),
		previousFilename: file.previousFilename
			? normalizePath(file.previousFilename)
			: file.previousFilename,
	}));

	const testFiles = normalizedFiles
		.filter((file) => isTestFile(file.filename))
		.map((file) => buildEvidence(file.filename, "test file updated"));

	const codeFiles = normalizedFiles
		.filter((file) => isCodeFile(file.filename))
		.map((file) => buildEvidence(file.filename, "application code changed"));

	const docFiles = normalizedFiles
		.filter((file) => isDocFile(file.filename))
		.map((file) => buildEvidence(file.filename, "documentation changed"));

	const configFiles = normalizedFiles
		.filter((file) => isConfigOrEnvFile(file.filename))
		.map((file) =>
			buildEvidence(file.filename, "config or environment surface changed"),
		);

	const breakingFiles = normalizedFiles
		.filter(
			(file) =>
				isBreakingSurfaceFile(file.filename) &&
				looksLikeBreakingPatch(file),
		)
		.map((file) =>
			buildEvidence(file.filename, "public contract or signature changed"),
		);

	const items: PRReviewChecklistItem[] = [];

	if (testFiles.length > 0 || codeFiles.length > 0) {
		const evidence = dedupeEvidence(
			testFiles.length > 0 ? testFiles : codeFiles.slice(0, 8),
		);
		items.push({
			key: "tests",
			label: "Are tests included or updated?",
			reason:
				testFiles.length > 0
					? "Test files changed in this PR. Review whether the updated coverage matches the implementation changes."
					: "Application code changed without obvious test-file updates. Review whether tests should be added or updated.",
			evidence,
			fingerprint: buildPRReviewChecklistFingerprint({ key: "tests", evidence }),
		});
	}

	if (docFiles.length > 0 || configFiles.length > 0 || breakingFiles.length > 0) {
		const evidence = dedupeEvidence(
			docFiles.length > 0
				? docFiles
				: [...breakingFiles, ...configFiles].slice(0, 8),
		);
		items.push({
			key: "docs",
			label: "Are docs updated?",
			reason:
				docFiles.length > 0
					? "Documentation files changed in this PR. Review whether the docs stay consistent with the implementation."
					: "This PR touches public, config, or contract-heavy surfaces. Review whether user-facing or operator-facing docs should be updated.",
			evidence,
			fingerprint: buildPRReviewChecklistFingerprint({ key: "docs", evidence }),
		});
	}

	if (breakingFiles.length > 0) {
		const evidence = dedupeEvidence(breakingFiles);
		items.push({
			key: "breaking-changes",
			label: "Does this introduce breaking changes?",
			reason: "The diff includes likely API, type, route, or schema contract changes. Review whether this is a breaking change and whether migration guidance is needed.",
			evidence,
			fingerprint: buildPRReviewChecklistFingerprint({
				key: "breaking-changes",
				evidence,
			}),
		});
	}

	if (configFiles.length > 0) {
		const evidence = dedupeEvidence(configFiles);
		items.push({
			key: "config-env",
			label: "Are config or environment changes documented and safe?",
			reason: "This PR changes environment, configuration, workflow, or schema surfaces. Review rollout safety, secret handling, and migration impact.",
			evidence,
			fingerprint: buildPRReviewChecklistFingerprint({
				key: "config-env",
				evidence,
			}),
		});
	}

	return items;
}
