import { describe, expect, it } from "vitest";
import type { DiffLine } from "@/lib/github-utils";
import { buildDiffViewportModel, buildSplitRows } from "./diff-viewport-model";

describe("buildSplitRows", () => {
	it("pairs remove and add blocks for split diff rendering", () => {
		const lines: DiffLine[] = [
			{ type: "header", content: "@@ -1,2 +1,2 @@" },
			{
				type: "remove",
				content: "const oldValue = 1;",
				oldLineNumber: 1,
				segments: [],
			},
			{
				type: "add",
				content: "const newValue = 2;",
				newLineNumber: 1,
				segments: [],
			},
			{
				type: "context",
				content: "return value;",
				oldLineNumber: 2,
				newLineNumber: 2,
				segments: [],
			},
		];

		const rows = buildSplitRows(lines);

		expect(rows).toHaveLength(3);
		expect(rows[0]).toMatchObject({
			type: "header",
			headerContent: "@@ -1,2 +1,2 @@",
			hunkIndex: 0,
		});
		expect(rows[1]).toMatchObject({
			type: "pair",
			left: { type: "remove", oldLineNumber: 1 },
			right: { type: "add", newLineNumber: 1 },
		});
		expect(rows[2]).toMatchObject({
			type: "pair",
			left: { type: "context", oldLineNumber: 2, newLineNumber: 2 },
			right: { type: "context", oldLineNumber: 2, newLineNumber: 2 },
		});
	});
});

describe("buildDiffViewportModel", () => {
	it("extracts hunk metadata alongside split rows", () => {
		const lines: DiffLine[] = [
			{ type: "header", content: "@@ -10,2 +12,4 @@ function demo" },
			{
				type: "context",
				content: "const stable = true;",
				oldLineNumber: 10,
				newLineNumber: 12,
				segments: [],
			},
			{
				type: "add",
				content: "const changed = true;",
				newLineNumber: 13,
				segments: [],
			},
		];

		const model = buildDiffViewportModel(lines);

		expect(model.lines).toEqual(lines);
		expect(model.splitRows).toHaveLength(3);
		expect(model.hunkInfos).toEqual([
			{
				index: 0,
				newStart: 12,
				newCount: 4,
				endNewLine: 15,
			},
		]);
	});
});
