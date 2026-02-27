/**
 * Pure 3-way merge algorithm.
 * Computes LCS-based diffs between ancestor↔base and ancestor↔head,
 * then walks both diffs to produce clean or conflict hunks.
 */

export interface MergeHunk {
	type: "clean" | "conflict";
	/** For clean hunks: the auto-merged lines */
	resolvedLines?: string[];
	/** For conflict hunks: original ancestor lines */
	ancestorLines?: string[];
	/** For conflict hunks: base branch ("ours") lines */
	baseLines?: string[];
	/** For conflict hunks: head branch ("theirs") lines */
	headLines?: string[];
}

export interface MergeResult {
	hunks: MergeHunk[];
	hasConflicts: boolean;
}

export interface ConflictFileData {
	path: string;
	hunks: MergeHunk[];
	hasConflicts: boolean;
	/** File only changed on one side — already resolved */
	autoResolved: boolean;
}

// ── LCS-based diff ──────────────────────────────────────────────

interface DiffOp {
	type: "equal" | "insert" | "delete";
	lines: string[];
	/** Original index in the "from" array (for delete/equal) */
	fromStart: number;
	/** Original index in the "to" array (for insert/equal) */
	toStart: number;
}

/**
 * Compute LCS table between two string arrays.
 * Returns the DP table (rows = a.length+1, cols = b.length+1).
 */
function lcsTable(a: string[], b: string[]): number[][] {
	const m = a.length;
	const n = b.length;
	// Use flat arrays for better perf on large files
	const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (a[i - 1] === b[j - 1]) {
				dp[i][j] = dp[i - 1][j - 1] + 1;
			} else {
				dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
			}
		}
	}
	return dp;
}

/**
 * Produce a sequence of diff operations from `from` → `to`.
 */
function diff(from: string[], to: string[]): DiffOp[] {
	const dp = lcsTable(from, to);
	const ops: DiffOp[] = [];
	let i = from.length;
	let j = to.length;

	// Backtrack through LCS to find edits
	const rawOps: Array<{
		type: "equal" | "insert" | "delete";
		fromIdx: number;
		toIdx: number;
		line: string;
	}> = [];

	while (i > 0 || j > 0) {
		if (i > 0 && j > 0 && from[i - 1] === to[j - 1]) {
			rawOps.push({
				type: "equal",
				fromIdx: i - 1,
				toIdx: j - 1,
				line: from[i - 1],
			});
			i--;
			j--;
		} else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
			rawOps.push({ type: "insert", fromIdx: i, toIdx: j - 1, line: to[j - 1] });
			j--;
		} else {
			rawOps.push({
				type: "delete",
				fromIdx: i - 1,
				toIdx: j,
				line: from[i - 1],
			});
			i--;
		}
	}

	rawOps.reverse();

	// Merge consecutive ops of the same type
	for (const op of rawOps) {
		const last = ops[ops.length - 1];
		if (last && last.type === op.type) {
			last.lines.push(op.line);
		} else {
			ops.push({
				type: op.type,
				lines: [op.line],
				fromStart: op.fromIdx,
				toStart: op.toIdx,
			});
		}
	}

	return ops;
}

// ── Edit-region extraction ──────────────────────────────────────

interface EditRegion {
	/** Start index in ancestor (inclusive) */
	ancestorStart: number;
	/** End index in ancestor (exclusive) */
	ancestorEnd: number;
	/** The replacement lines from the changed side */
	changedLines: string[];
}

/**
 * From a diff(ancestor, changed), extract contiguous edit regions
 * (ranges where ancestor lines were deleted/replaced or new lines inserted).
 */
function extractEdits(ancestor: string[], changed: string[]): EditRegion[] {
	const ops = diff(ancestor, changed);
	const regions: EditRegion[] = [];
	let ancestorIdx = 0;

	for (const op of ops) {
		if (op.type === "equal") {
			ancestorIdx += op.lines.length;
		} else if (op.type === "delete") {
			// Lines removed from ancestor
			const start = ancestorIdx;
			ancestorIdx += op.lines.length;
			// Check if next op is an insert (replace)
			const last = regions[regions.length - 1];
			if (last && last.ancestorEnd === start) {
				last.ancestorEnd = ancestorIdx;
			} else {
				regions.push({
					ancestorStart: start,
					ancestorEnd: ancestorIdx,
					changedLines: [],
				});
			}
		} else {
			// insert
			const last = regions[regions.length - 1];
			if (last && last.ancestorEnd === ancestorIdx) {
				last.changedLines.push(...op.lines);
			} else {
				regions.push({
					ancestorStart: ancestorIdx,
					ancestorEnd: ancestorIdx,
					changedLines: [...op.lines],
				});
			}
		}
	}

	// Attach changed lines to delete regions (for replacements, the insert follows delete)
	// Re-extract more carefully: walk ops and group adjacent delete+insert
	return mergeAdjacentEdits(extractEditsFromOps(ops));
}

function extractEditsFromOps(ops: DiffOp[]): EditRegion[] {
	const regions: EditRegion[] = [];
	let ancestorIdx = 0;

	for (const op of ops) {
		if (op.type === "equal") {
			ancestorIdx += op.lines.length;
		} else if (op.type === "delete") {
			regions.push({
				ancestorStart: ancestorIdx,
				ancestorEnd: ancestorIdx + op.lines.length,
				changedLines: [],
			});
			ancestorIdx += op.lines.length;
		} else {
			// insert — attach to previous region if adjacent, else create pure insert
			const prev = regions[regions.length - 1];
			if (
				prev &&
				prev.ancestorEnd === ancestorIdx &&
				prev.changedLines.length === 0
			) {
				prev.changedLines = [...op.lines];
			} else {
				regions.push({
					ancestorStart: ancestorIdx,
					ancestorEnd: ancestorIdx,
					changedLines: [...op.lines],
				});
			}
		}
	}

	return regions;
}

function mergeAdjacentEdits(regions: EditRegion[]): EditRegion[] {
	if (regions.length === 0) return [];
	const merged: EditRegion[] = [regions[0]];
	for (let i = 1; i < regions.length; i++) {
		const prev = merged[merged.length - 1];
		const cur = regions[i];
		if (prev.ancestorEnd === cur.ancestorStart) {
			prev.ancestorEnd = cur.ancestorEnd;
			prev.changedLines.push(...cur.changedLines);
		} else {
			merged.push(cur);
		}
	}
	return merged;
}

// ── 3-way merge ─────────────────────────────────────────────────

/**
 * Perform a 3-way merge.
 * - `ancestor`: common ancestor (merge base)
 * - `base`: base branch tip ("ours")
 * - `head`: head branch tip ("theirs")
 */
export function threeWayMerge(ancestor: string[], base: string[], head: string[]): MergeResult {
	const baseEdits = extractEdits(ancestor, base);
	const headEdits = extractEdits(ancestor, head);

	const hunks: MergeHunk[] = [];
	let ancestorPos = 0;
	let bi = 0;
	let hi = 0;

	while (bi < baseEdits.length || hi < headEdits.length) {
		const be = bi < baseEdits.length ? baseEdits[bi] : null;
		const he = hi < headEdits.length ? headEdits[hi] : null;

		if (be && he) {
			// Determine which edit starts first
			const beStart = be.ancestorStart;
			const heStart = he.ancestorStart;

			if (be.ancestorEnd <= heStart) {
				// Base edit finishes before head edit starts — no overlap
				// Emit clean context before this edit
				if (ancestorPos < beStart) {
					hunks.push({
						type: "clean",
						resolvedLines: ancestor.slice(ancestorPos, beStart),
					});
				}
				// Apply base edit (clean)
				hunks.push({ type: "clean", resolvedLines: be.changedLines });
				ancestorPos = be.ancestorEnd;
				bi++;
			} else if (he.ancestorEnd <= beStart) {
				// Head edit finishes before base edit starts — no overlap
				if (ancestorPos < heStart) {
					hunks.push({
						type: "clean",
						resolvedLines: ancestor.slice(ancestorPos, heStart),
					});
				}
				hunks.push({ type: "clean", resolvedLines: he.changedLines });
				ancestorPos = he.ancestorEnd;
				hi++;
			} else {
				// Overlapping edits — check if they're identical
				const sameChange =
					be.ancestorStart === he.ancestorStart &&
					be.ancestorEnd === he.ancestorEnd &&
					be.changedLines.length === he.changedLines.length &&
					be.changedLines.every(
						(l, idx) => l === he.changedLines[idx],
					);

				if (sameChange) {
					// Both sides made the same change — clean merge
					if (ancestorPos < beStart) {
						hunks.push({
							type: "clean",
							resolvedLines: ancestor.slice(
								ancestorPos,
								beStart,
							),
						});
					}
					hunks.push({
						type: "clean",
						resolvedLines: be.changedLines,
					});
					ancestorPos = be.ancestorEnd;
					bi++;
					hi++;
				} else {
					// True conflict
					const overlapStart = Math.min(beStart, heStart);
					const overlapEnd = Math.max(be.ancestorEnd, he.ancestorEnd);

					if (ancestorPos < overlapStart) {
						hunks.push({
							type: "clean",
							resolvedLines: ancestor.slice(
								ancestorPos,
								overlapStart,
							),
						});
					}

					hunks.push({
						type: "conflict",
						ancestorLines: ancestor.slice(
							overlapStart,
							overlapEnd,
						),
						baseLines: be.changedLines,
						headLines: he.changedLines,
					});

					ancestorPos = overlapEnd;
					bi++;
					hi++;
					// Skip any further edits consumed by this overlap
					while (
						bi < baseEdits.length &&
						baseEdits[bi].ancestorStart < overlapEnd
					)
						bi++;
					while (
						hi < headEdits.length &&
						headEdits[hi].ancestorStart < overlapEnd
					)
						hi++;
				}
			}
		} else if (be) {
			// Only base edits remaining
			if (ancestorPos < be.ancestorStart) {
				hunks.push({
					type: "clean",
					resolvedLines: ancestor.slice(
						ancestorPos,
						be.ancestorStart,
					),
				});
			}
			hunks.push({ type: "clean", resolvedLines: be.changedLines });
			ancestorPos = be.ancestorEnd;
			bi++;
		} else if (he) {
			// Only head edits remaining
			if (ancestorPos < he.ancestorStart) {
				hunks.push({
					type: "clean",
					resolvedLines: ancestor.slice(
						ancestorPos,
						he.ancestorStart,
					),
				});
			}
			hunks.push({ type: "clean", resolvedLines: he.changedLines });
			ancestorPos = he.ancestorEnd;
			hi++;
		}
	}

	// Remaining ancestor lines after all edits
	if (ancestorPos < ancestor.length) {
		hunks.push({ type: "clean", resolvedLines: ancestor.slice(ancestorPos) });
	}

	// Merge adjacent clean hunks
	const merged: MergeHunk[] = [];
	for (const h of hunks) {
		const last = merged[merged.length - 1];
		if (h.type === "clean" && last?.type === "clean") {
			last.resolvedLines!.push(...(h.resolvedLines || []));
		} else {
			merged.push(h);
		}
	}

	return {
		hunks: merged,
		hasConflicts: merged.some((h) => h.type === "conflict"),
	};
}
