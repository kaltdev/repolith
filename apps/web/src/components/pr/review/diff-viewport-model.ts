import { parseHunkHeader, type DiffLine } from "@/lib/github-utils";

export interface SplitRow {
	type: "pair" | "header";
	left: DiffLine | null;
	right: DiffLine | null;
	headerContent?: string;
	hunkIndex?: number;
}

export interface DiffViewportHunkInfo {
	index: number;
	newStart: number;
	newCount: number;
	endNewLine: number;
}

export interface DiffViewportModel {
	lines: DiffLine[];
	splitRows: SplitRow[];
	hunkInfos: DiffViewportHunkInfo[];
}

export function buildSplitRows(lines: DiffLine[]): SplitRow[] {
	const rows: SplitRow[] = [];
	let index = 0;

	while (index < lines.length) {
		const line = lines[index];

		if (line.type === "header") {
			rows.push({
				type: "header",
				left: null,
				right: null,
				headerContent: line.content,
				hunkIndex: index,
			});
			index++;
			continue;
		}

		if (line.type === "context") {
			rows.push({ type: "pair", left: line, right: line });
			index++;
			continue;
		}

		const removes: DiffLine[] = [];
		const adds: DiffLine[] = [];

		while (index < lines.length && lines[index].type === "remove") {
			removes.push(lines[index]);
			index++;
		}

		while (index < lines.length && lines[index].type === "add") {
			adds.push(lines[index]);
			index++;
		}

		const rowCount = Math.max(removes.length, adds.length);
		for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
			rows.push({
				type: "pair",
				left: rowIndex < removes.length ? removes[rowIndex] : null,
				right: rowIndex < adds.length ? adds[rowIndex] : null,
			});
		}
	}

	return rows;
}

export function buildDiffViewportModel(lines: DiffLine[]): DiffViewportModel {
	const hunkInfos = lines.reduce<DiffViewportHunkInfo[]>((accumulator, line, index) => {
		if (line.type !== "header") {
			return accumulator;
		}

		const parsed = parseHunkHeader(line.content);
		if (!parsed) {
			return accumulator;
		}

		accumulator.push({
			index,
			newStart: parsed.newStart,
			newCount: parsed.newCount,
			endNewLine: parsed.newStart + parsed.newCount - 1,
		});

		return accumulator;
	}, []);

	return {
		lines,
		splitRows: buildSplitRows(lines),
		hunkInfos,
	};
}
