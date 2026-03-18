"use client";

import { Fragment, type ReactNode, useCallback, useRef, useState } from "react";
import { Loader2, Plus, UnfoldVertical } from "lucide-react";
import type { DiffLine } from "@/lib/github-utils";
import type { SyntaxToken } from "@/lib/shiki";
import { cn } from "@/lib/utils";
import { ResizeHandle } from "@/components/ui/resize-handle";
import { SegmentedContent, SyntaxSegmentedContent } from "./diff-content";
import type { DiffViewportHunkInfo, DiffViewportModel, SplitRow } from "./diff-viewport-model";
import type { PRReviewComment } from "./review-models";

interface DiffViewportProps {
	model: DiffViewportModel;
	splitView: boolean;
	wordWrap: boolean;
	canComment: boolean;
	commentsByLine: Map<string, PRReviewComment[]>;
	commentRange: {
		startLine: number;
		endLine: number;
		side: "LEFT" | "RIGHT";
	} | null;
	selectionRange: { start: number; end: number; side: "LEFT" | "RIGHT" } | null;
	fileHighlightData?: Record<string, SyntaxToken[]>;
	highlightLines?: Set<number> | null;
	expandedLines: Map<number, string[]>;
	isLoadingExpand: number | null;
	onExpandHunk: (hunkIdx: number) => void;
	onLineClick: (lineNum: number, side: "LEFT" | "RIGHT", shiftKey: boolean) => void;
	onLineMouseDown: (lineNum: number, side: "LEFT" | "RIGHT") => void;
	onLineHover: (lineNum: number) => void;
	selectedLinesContent?: string;
	selectedCodeForAI?: string;
	hideComments?: boolean;
	renderInlineComment: (comment: PRReviewComment) => ReactNode;
	renderCommentForm: (context: {
		line: number;
		side: "LEFT" | "RIGHT";
		startLine?: number;
		selectedLinesContent?: string;
		selectedCodeForAI?: string;
	}) => ReactNode;
}

export function DiffViewport({
	model,
	splitView,
	wordWrap,
	canComment,
	commentsByLine,
	commentRange,
	selectionRange,
	fileHighlightData,
	highlightLines,
	expandedLines,
	isLoadingExpand,
	onExpandHunk,
	onLineClick,
	onLineMouseDown,
	onLineHover,
	selectedLinesContent,
	selectedCodeForAI,
	hideComments = false,
	renderInlineComment,
	renderCommentForm,
}: DiffViewportProps) {
	if (splitView) {
		return (
			<SplitDiffTable
				model={model}
				wordWrap={wordWrap}
				canComment={canComment}
				commentsByLine={commentsByLine}
				commentRange={commentRange}
				selectionRange={selectionRange}
				fileHighlightData={fileHighlightData}
				highlightLines={highlightLines}
				expandedLines={expandedLines}
				isLoadingExpand={isLoadingExpand}
				onExpandHunk={onExpandHunk}
				onLineClick={onLineClick}
				onLineMouseDown={onLineMouseDown}
				onLineHover={onLineHover}
				selectedLinesContent={selectedLinesContent}
				selectedCodeForAI={selectedCodeForAI}
				hideComments={hideComments}
				renderInlineComment={renderInlineComment}
				renderCommentForm={renderCommentForm}
			/>
		);
	}

	return (
		<table className={cn("w-full border-collapse", wordWrap && "table-fixed")}>
			{wordWrap && (
				<colgroup>
					<col className="w-[3px]" />
					<col className="w-10" />
					<col />
				</colgroup>
			)}
			<tbody>
				{model.lines.map((line, index) => {
					const lineNum =
						line.type === "add" || line.type === "context"
							? line.newLineNumber
							: line.type === "remove"
								? line.oldLineNumber
								: undefined;
					const side: "LEFT" | "RIGHT" =
						line.type === "remove" ? "LEFT" : "RIGHT";

					const inlineComments: PRReviewComment[] = [];
					if (lineNum !== undefined && !hideComments) {
						const rightComments =
							commentsByLine.get(`RIGHT-${lineNum}`) ||
							[];
						const leftComments =
							commentsByLine.get(`LEFT-${lineNum}`) || [];
						if (line.type === "remove") {
							inlineComments.push(...leftComments);
						} else {
							inlineComments.push(...rightComments);
						}
					}

					const isCommentFormOpen =
						commentRange !== null &&
						lineNum !== undefined &&
						lineNum === commentRange.endLine &&
						side === commentRange.side;

					const isSelected =
						selectionRange !== null &&
						lineNum !== undefined &&
						lineNum >= selectionRange.start &&
						lineNum <= selectionRange.end &&
						side === selectionRange.side;

					let syntaxTokens: SyntaxToken[] | undefined;
					if (fileHighlightData && lineNum !== undefined) {
						if (line.type === "remove") {
							syntaxTokens =
								fileHighlightData[
									`R-${line.oldLineNumber}`
								];
						} else if (line.type === "add") {
							syntaxTokens =
								fileHighlightData[
									`A-${line.newLineNumber}`
								];
						} else if (line.type === "context") {
							syntaxTokens =
								fileHighlightData[
									`C-${line.newLineNumber}`
								];
						}
					}

					const expandedContent =
						line.type === "header"
							? expandedLines.get(index)
							: undefined;

					return (
						<UnifiedDiffLineRow
							key={index}
							line={line}
							diffIdx={index}
							wordWrap={wordWrap}
							canComment={canComment}
							inlineComments={inlineComments}
							isCommentFormOpen={isCommentFormOpen}
							isSelected={isSelected}
							isHighlighted={
								lineNum !== undefined &&
								!!highlightLines?.has(lineNum)
							}
							syntaxTokens={syntaxTokens}
							expandedContent={expandedContent}
							expandStartLine={
								expandedContent
									? getExpandedContextStartLine(
											model.hunkInfos,
											index,
										)
									: undefined
							}
							isExpandLoading={isLoadingExpand === index}
							onExpandHunk={() => onExpandHunk(index)}
							onOpenComment={(shiftKey) => {
								if (
									lineNum !== undefined &&
									line.type !== "header"
								) {
									onLineClick(
										lineNum,
										side,
										shiftKey,
									);
								}
							}}
							onStartSelect={() => {
								if (
									lineNum !== undefined &&
									line.type !== "header"
								) {
									onLineMouseDown(
										lineNum,
										side,
									);
								}
							}}
							onHoverLine={() => {
								if (lineNum !== undefined) {
									onLineHover(lineNum);
								}
							}}
							renderInlineComment={renderInlineComment}
							renderCommentForm={() =>
								lineNum === undefined
									? null
									: renderCommentForm({
											line: lineNum,
											side,
											startLine: commentRange?.startLine,
											selectedLinesContent,
											selectedCodeForAI,
										})
							}
						/>
					);
				})}
			</tbody>
		</table>
	);
}

function UnifiedDiffLineRow({
	line,
	diffIdx,
	wordWrap,
	canComment,
	inlineComments,
	isCommentFormOpen,
	isSelected,
	isHighlighted,
	syntaxTokens,
	expandedContent,
	expandStartLine,
	isExpandLoading,
	onExpandHunk,
	onOpenComment,
	onStartSelect,
	onHoverLine,
	renderInlineComment,
	renderCommentForm,
}: {
	line: DiffLine;
	diffIdx: number;
	wordWrap: boolean;
	canComment: boolean;
	inlineComments: PRReviewComment[];
	isCommentFormOpen: boolean;
	isSelected?: boolean;
	isHighlighted?: boolean;
	syntaxTokens?: SyntaxToken[];
	expandedContent?: string[];
	expandStartLine?: number;
	isExpandLoading?: boolean;
	onExpandHunk?: () => void;
	onOpenComment: (shiftKey: boolean) => void;
	onStartSelect?: () => void;
	onHoverLine?: () => void;
	renderInlineComment: (comment: PRReviewComment) => ReactNode;
	renderCommentForm: () => ReactNode;
}) {
	if (line.type === "header") {
		const functionName = line.content.match(/@@ .+? @@\s*(.*)/)?.[1];

		return (
			<>
				{expandedContent?.map((text, index) => (
					<tr key={`exp-${index}`} className="diff-expanded-context">
						<td className="w-[3px] p-0 sticky left-0 z-[1]" />
						<td className="w-10 py-0 pr-2 text-right text-[11px] font-mono text-muted-foreground/25 select-none border-r border-border/40 sticky left-[3px] z-[1]">
							{(expandStartLine ?? 1) + index}
						</td>
						<td
							className={cn(
								"py-0 font-mono text-[12.5px] leading-[20px]",
								wordWrap
									? "whitespace-pre-wrap break-words"
									: "whitespace-pre",
							)}
						>
							<div className="flex">
								<span className="inline-block w-5 text-center shrink-0 select-none text-transparent">
									{" "}
								</span>
								<span className="pl-1 text-muted-foreground/60">
									{text}
								</span>
							</div>
						</td>
					</tr>
				))}
				<tr className="diff-hunk-header">
					<td className="w-[3px] p-0 sticky left-0 z-[1]" />
					<td className="w-10 py-1.5 pr-2 text-right text-[11px] font-mono text-info/40 select-none bg-info/[0.04] dark:bg-info/[0.06] border-r border-border/60 sticky left-[3px] z-[1]">
						{onExpandHunk && !expandedContent ? (
							<button
								onClick={onExpandHunk}
								disabled={isExpandLoading}
								className="w-full flex items-center justify-center cursor-pointer hover:text-info/70 transition-colors disabled:opacity-40"
								title="Expand context"
							>
								{isExpandLoading ? (
									<Loader2 className="w-3.5 h-3.5 animate-spin" />
								) : (
									<UnfoldVertical className="w-3.5 h-3.5" />
								)}
							</button>
						) : (
							"..."
						)}
					</td>
					<td className="py-1.5 px-3 text-[11px] font-mono bg-info/[0.04] dark:bg-info/[0.06]">
						<span className="text-info/60 dark:text-info/50">
							{line.content.match(/@@ .+? @@/)?.[0]}
						</span>
						{functionName && (
							<span className="text-muted-foreground/50 ml-2">
								{functionName}
							</span>
						)}
					</td>
				</tr>
			</>
		);
	}

	const isAdd = line.type === "add";
	const isDelete = line.type === "remove";
	const lineNum = isAdd ? line.newLineNumber : line.oldLineNumber;

	return (
		<>
			<tr
				data-line={lineNum}
				data-diff-idx={diffIdx}
				onMouseEnter={onHoverLine}
				className={cn(
					"group/line hover:brightness-95 dark:hover:brightness-110 transition-[filter] duration-75",
					isAdd && "diff-add-row",
					isDelete && "diff-del-row",
					isSelected && "!bg-muted-foreground/[0.08]",
					isHighlighted && "!bg-warning/10",
				)}
			>
				<td
					className={cn(
						"w-[3px] p-0 sticky left-0 z-[1]",
						isSelected
							? "bg-muted-foreground"
							: isAdd
								? "bg-success"
								: isDelete
									? "bg-destructive"
									: "",
					)}
				/>
				<td
					className={cn(
						"w-10 py-0 pr-2 text-right text-[11px] font-mono select-none border-r border-border/40 sticky left-[3px] z-[1] relative",
						isSelected
							? "bg-muted-foreground/[0.06] text-muted-foreground"
							: isAdd
								? "bg-diff-add-gutter text-diff-add-gutter"
								: isDelete
									? "bg-diff-del-gutter text-diff-del-gutter"
									: "text-muted-foreground/30",
					)}
				>
					{canComment && lineNum !== undefined && (
						<button
							onMouseDown={(event) => {
								event.preventDefault();
								onStartSelect?.();
							}}
							onClick={(event) =>
								onOpenComment(event.shiftKey)
							}
							className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center opacity-0 group-hover/line:opacity-100 transition-opacity text-foreground/50 hover:text-foreground/70 cursor-pointer"
							title="Add review comment (shift+click for range)"
						>
							<Plus className="w-3 h-3" />
						</button>
					)}
					{lineNum ?? ""}
				</td>
				<td
					className={cn(
						"py-0 font-mono text-[12.5px] leading-[20px]",
						wordWrap
							? "whitespace-pre-wrap break-words"
							: "whitespace-pre",
						isAdd && "bg-diff-add-bg",
						isDelete && "bg-diff-del-bg",
					)}
				>
					{renderDiffCellContent(line, syntaxTokens)}
				</td>
			</tr>

			{inlineComments.map((comment) => (
				<tr key={`rc-${comment.id}`}>
					<td colSpan={3} className="p-0">
						{renderInlineComment(comment)}
					</td>
				</tr>
			))}

			{isCommentFormOpen && lineNum !== undefined && (
				<tr>
					<td colSpan={3} className="p-0">
						{renderCommentForm()}
					</td>
				</tr>
			)}
		</>
	);
}

function SplitDiffTable({
	model,
	wordWrap,
	canComment,
	commentsByLine,
	commentRange,
	selectionRange,
	fileHighlightData,
	highlightLines,
	expandedLines,
	isLoadingExpand,
	onExpandHunk,
	onLineClick,
	onLineMouseDown,
	onLineHover,
	selectedLinesContent,
	selectedCodeForAI,
	hideComments,
	renderInlineComment,
	renderCommentForm,
}: {
	model: DiffViewportModel;
	wordWrap: boolean;
	canComment: boolean;
	commentsByLine: Map<string, PRReviewComment[]>;
	commentRange: {
		startLine: number;
		endLine: number;
		side: "LEFT" | "RIGHT";
	} | null;
	selectionRange: { start: number; end: number; side: "LEFT" | "RIGHT" } | null;
	fileHighlightData?: Record<string, SyntaxToken[]>;
	highlightLines?: Set<number> | null;
	expandedLines: Map<number, string[]>;
	isLoadingExpand: number | null;
	onExpandHunk: (hunkIdx: number) => void;
	onLineClick: (lineNum: number, side: "LEFT" | "RIGHT", shiftKey: boolean) => void;
	onLineMouseDown: (lineNum: number, side: "LEFT" | "RIGHT") => void;
	onLineHover: (lineNum: number) => void;
	selectedLinesContent?: string;
	selectedCodeForAI?: string;
	hideComments?: boolean;
	renderInlineComment: (comment: PRReviewComment) => ReactNode;
	renderCommentForm: (context: {
		line: number;
		side: "LEFT" | "RIGHT";
		startLine?: number;
		selectedLinesContent?: string;
		selectedCodeForAI?: string;
	}) => ReactNode;
}) {
	const [splitRatio, setSplitRatio] = useState(50);
	const splitContainerRef = useRef<HTMLDivElement>(null);

	const handleSplitResize = useCallback((clientX: number) => {
		if (!splitContainerRef.current) return;
		const rect = splitContainerRef.current.getBoundingClientRect();
		const ratio = ((clientX - rect.left) / rect.width) * 100;
		setSplitRatio(Math.max(20, Math.min(80, ratio)));
	}, []);

	const getSyntaxTokens = (line: DiffLine | null) => {
		if (!line || !fileHighlightData) return undefined;
		if (line.type === "remove") return fileHighlightData[`R-${line.oldLineNumber}`];
		if (line.type === "add") return fileHighlightData[`A-${line.newLineNumber}`];
		if (line.type === "context") return fileHighlightData[`C-${line.newLineNumber}`];
		return undefined;
	};

	const isLineSelected = (line: DiffLine | null, side: "LEFT" | "RIGHT") => {
		if (!selectionRange || !line) return false;
		const lineNumber = side === "LEFT" ? line.oldLineNumber : line.newLineNumber;
		return (
			lineNumber !== undefined &&
			lineNumber >= selectionRange.start &&
			lineNumber <= selectionRange.end &&
			side === selectionRange.side
		);
	};

	const getInlineComments = (
		line: DiffLine | null,
		side: "LEFT" | "RIGHT",
	): PRReviewComment[] => {
		if (hideComments || !line) return [];
		const lineNumber = side === "LEFT" ? line.oldLineNumber : line.newLineNumber;
		if (lineNumber === undefined) return [];
		if (side === "LEFT") return commentsByLine.get(`LEFT-${lineNumber}`) || [];
		return commentsByLine.get(`RIGHT-${lineNumber}`) || [];
	};

	const isCommentFormLine = (line: DiffLine | null, side: "LEFT" | "RIGHT") => {
		if (!commentRange || !line) return false;
		const lineNumber = side === "LEFT" ? line.oldLineNumber : line.newLineNumber;
		return (
			lineNumber !== undefined &&
			lineNumber === commentRange.endLine &&
			side === commentRange.side
		);
	};

	const gutterWidth = 43;
	const leftContentWidth = `calc(${splitRatio}% - ${gutterWidth}px)`;
	const rightContentWidth = `calc(${100 - splitRatio}% - ${gutterWidth}px)`;

	return (
		<div ref={splitContainerRef} className="relative">
			<table className={cn("w-full border-collapse", wordWrap && "table-fixed")}>
				<colgroup>
					<col className="w-[3px]" />
					<col className="w-10" />
					<col style={{ width: leftContentWidth }} />
					<col className="w-[3px]" />
					<col className="w-10" />
					<col style={{ width: rightContentWidth }} />
				</colgroup>
				<tbody>
					{model.splitRows.map((row, index) => {
						if (row.type === "header") {
							return (
								<SplitDiffHeaderRow
									key={`h-${index}`}
									row={row}
									wordWrap={wordWrap}
									expandedContent={
										row.hunkIndex !==
										undefined
											? expandedLines.get(
													row.hunkIndex,
												)
											: undefined
									}
									expandStartLine={getExpandedContextStartLine(
										model.hunkInfos,
										row.hunkIndex,
									)}
									isLoadingExpand={
										row.hunkIndex !==
											undefined &&
										isLoadingExpand ===
											row.hunkIndex
									}
									onExpandHunk={
										row.hunkIndex !==
										undefined
											? () =>
													onExpandHunk(
														row.hunkIndex!,
													)
											: undefined
									}
								/>
							);
						}

						const leftTokens = getSyntaxTokens(row.left);
						const rightTokens = getSyntaxTokens(row.right);
						const leftSelected = isLineSelected(
							row.left,
							"LEFT",
						);
						const rightSelected = isLineSelected(
							row.right,
							"RIGHT",
						);
						const leftLineNumber =
							row.left?.type === "remove"
								? row.left.oldLineNumber
								: row.left?.newLineNumber;
						const rightLineNumber =
							row.right?.type === "remove"
								? row.right.oldLineNumber
								: row.right?.newLineNumber;
						const leftSide: "LEFT" | "RIGHT" =
							row.left?.type === "remove" ||
							row.left?.type === "context"
								? "LEFT"
								: "RIGHT";
						const rightSide: "LEFT" | "RIGHT" = "RIGHT";
						const leftComments = row.left
							? getInlineComments(row.left, leftSide)
							: [];
						const rightComments = row.right
							? getInlineComments(row.right, rightSide)
							: [];
						const leftIsCommentForm = row.left
							? isCommentFormLine(row.left, leftSide)
							: false;
						const rightIsCommentForm = row.right
							? isCommentFormLine(row.right, rightSide)
							: false;
						const isRowHighlighted =
							highlightLines != null &&
							((rightLineNumber !== undefined &&
								highlightLines.has(
									rightLineNumber,
								)) ||
								(leftLineNumber !== undefined &&
									highlightLines.has(
										leftLineNumber,
									)));

						return (
							<Fragment key={`p-${index}`}>
								<tr
									data-line={
										rightLineNumber ??
										leftLineNumber
									}
									className={cn(
										"group/splitline hover:brightness-95 dark:hover:brightness-110 transition-[filter] duration-75",
										isRowHighlighted &&
											"!bg-warning/10",
									)}
									onMouseEnter={() => {
										if (
											leftLineNumber !==
											undefined
										)
											onLineHover(
												leftLineNumber,
											);
										if (
											rightLineNumber !==
											undefined
										)
											onLineHover(
												rightLineNumber,
											);
									}}
								>
									{renderSplitHalf({
										line: row.left,
										side: leftSide,
										tokens: leftTokens,
										isSelected: leftSelected,
										isFirst: true,
										wordWrap,
										canComment,
										onLineMouseDown,
										onLineClick,
									})}
									{renderSplitHalf({
										line: row.right,
										side: rightSide,
										tokens: rightTokens,
										isSelected: rightSelected,
										isFirst: false,
										wordWrap,
										canComment,
										onLineMouseDown,
										onLineClick,
									})}
								</tr>

								{leftComments.map((comment) => (
									<tr
										key={`lrc-${comment.id}`}
									>
										<td
											colSpan={3}
											className="p-0 align-top"
										>
											{renderInlineComment(
												comment,
											)}
										</td>
										<td
											colSpan={3}
											className="p-0"
										/>
									</tr>
								))}

								{rightComments.map((comment) => (
									<tr
										key={`rrc-${comment.id}`}
									>
										<td
											colSpan={3}
											className="p-0"
										/>
										<td
											colSpan={3}
											className="p-0 align-top"
										>
											{renderInlineComment(
												comment,
											)}
										</td>
									</tr>
								))}

								{(leftIsCommentForm ||
									rightIsCommentForm) &&
									commentRange && (
										<tr>
											{commentRange.side ===
											"LEFT" ? (
												<>
													<td
														colSpan={
															3
														}
														className="p-0 align-top"
													>
														{renderCommentForm(
															{
																line: commentRange.endLine,
																side: commentRange.side,
																startLine: commentRange.startLine,
																selectedLinesContent,
																selectedCodeForAI,
															},
														)}
													</td>
													<td
														colSpan={
															3
														}
														className="p-0"
													/>
												</>
											) : (
												<>
													<td
														colSpan={
															3
														}
														className="p-0"
													/>
													<td
														colSpan={
															3
														}
														className="p-0 align-top"
													>
														{renderCommentForm(
															{
																line: commentRange.endLine,
																side: commentRange.side,
																startLine: commentRange.startLine,
																selectedLinesContent,
																selectedCodeForAI,
															},
														)}
													</td>
												</>
											)}
										</tr>
									)}
							</Fragment>
						);
					})}
				</tbody>
			</table>

			<div
				className="absolute top-0 bottom-0 z-10"
				style={{
					left: `${splitRatio}%`,
					transform: "translateX(-50%)",
				}}
			>
				<ResizeHandle
					onResize={handleSplitResize}
					onDragStart={() => {}}
					onDragEnd={() => {}}
					onDoubleClick={() => setSplitRatio(50)}
				/>
			</div>
		</div>
	);
}

function SplitDiffHeaderRow({
	row,
	wordWrap,
	expandedContent,
	expandStartLine,
	isLoadingExpand,
	onExpandHunk,
}: {
	row: SplitRow;
	wordWrap: boolean;
	expandedContent?: string[];
	expandStartLine?: number;
	isLoadingExpand?: boolean;
	onExpandHunk?: () => void;
}) {
	const functionName = row.headerContent?.match(/@@ .+? @@\s*(.*)/)?.[1];

	return (
		<>
			{expandedContent?.map((text, index) => (
				<tr
					key={`exp-${row.hunkIndex}-${index}`}
					className="diff-expanded-context"
				>
					<td
						colSpan={6}
						className={cn(
							"py-0 font-mono text-[12.5px] leading-[20px]",
							wordWrap
								? "whitespace-pre-wrap break-words"
								: "whitespace-pre",
						)}
					>
						<div className="flex">
							<span className="inline-block w-10 text-right pr-2 shrink-0 text-[11px] text-muted-foreground/25 select-none">
								{(expandStartLine ?? 1) + index}
							</span>
							<span className="pl-1 text-muted-foreground/60">
								{text}
							</span>
						</div>
					</td>
				</tr>
			))}
			<tr className="diff-hunk-header">
				<td
					colSpan={6}
					className="py-1.5 px-3 text-[11px] font-mono bg-info/[0.04] dark:bg-info/[0.06]"
				>
					<div className="flex items-center gap-2">
						{onExpandHunk && !expandedContent && (
							<button
								onClick={onExpandHunk}
								disabled={isLoadingExpand}
								className="flex items-center justify-center cursor-pointer text-info/40 hover:text-info/70 transition-colors disabled:opacity-40"
								title="Expand context"
							>
								{isLoadingExpand ? (
									<Loader2 className="w-3.5 h-3.5 animate-spin" />
								) : (
									<UnfoldVertical className="w-3.5 h-3.5" />
								)}
							</button>
						)}
						<span className="text-info/60 dark:text-info/50">
							{row.headerContent?.match(/@@ .+? @@/)?.[0]}
						</span>
						{functionName && (
							<span className="text-muted-foreground/50">
								{functionName}
							</span>
						)}
					</div>
				</td>
			</tr>
		</>
	);
}

function renderSplitHalf({
	line,
	side,
	tokens,
	isSelected,
	isFirst,
	wordWrap,
	canComment,
	onLineMouseDown,
	onLineClick,
}: {
	line: DiffLine | null;
	side: "LEFT" | "RIGHT";
	tokens: SyntaxToken[] | undefined;
	isSelected: boolean;
	isFirst: boolean;
	wordWrap: boolean;
	canComment: boolean;
	onLineMouseDown: (lineNum: number, side: "LEFT" | "RIGHT") => void;
	onLineClick: (lineNum: number, side: "LEFT" | "RIGHT", shiftKey: boolean) => void;
}) {
	const lineNumber = side === "LEFT" ? line?.oldLineNumber : line?.newLineNumber;
	const isAdd = line?.type === "add";
	const isDelete = line?.type === "remove";
	const isEmpty = !line;

	return (
		<>
			<td
				className={cn(
					"w-[3px] p-0",
					isFirst && "sticky left-0 z-[1]",
					isEmpty
						? ""
						: isSelected
							? "bg-muted-foreground"
							: isAdd
								? "bg-success"
								: isDelete
									? "bg-destructive"
									: "",
				)}
			/>
			<td
				className={cn(
					"w-10 py-0 pr-2 text-right text-[11px] font-mono select-none border-r border-border/40 relative",
					isEmpty
						? "diff-split-empty"
						: isSelected
							? "bg-muted-foreground/[0.06] text-muted-foreground"
							: isAdd
								? "bg-diff-add-gutter text-diff-add-gutter"
								: isDelete
									? "bg-diff-del-gutter text-diff-del-gutter"
									: "text-muted-foreground/30",
				)}
			>
				{canComment &&
					line &&
					lineNumber !== undefined &&
					line.type !== "header" && (
						<button
							onMouseDown={(event) => {
								event.preventDefault();
								onLineMouseDown(lineNumber, side);
							}}
							onClick={(event) =>
								onLineClick(
									lineNumber,
									side,
									event.shiftKey,
								)
							}
							className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center opacity-0 group-hover/splitline:opacity-100 transition-opacity text-foreground/50 hover:text-foreground/70 cursor-pointer"
							title="Add review comment"
						>
							<Plus className="w-3 h-3" />
						</button>
					)}
				{lineNumber ?? ""}
			</td>
			<td
				className={cn(
					"py-0 font-mono text-[12.5px] leading-[20px]",
					wordWrap
						? "whitespace-pre-wrap break-words"
						: "whitespace-pre",
					isEmpty
						? "diff-split-empty"
						: isAdd
							? "bg-diff-add-bg"
							: isDelete
								? "bg-diff-del-bg"
								: "",
					isSelected && !isEmpty && "!bg-muted-foreground/[0.08]",
					!isFirst && "border-l border-border/30 diff-split-divider",
				)}
			>
				{renderDiffCellContent(line, tokens)}
			</td>
		</>
	);
}

function renderDiffCellContent(line: DiffLine | null, tokens: SyntaxToken[] | undefined) {
	if (!line) return null;

	const isAdd = line.type === "add";
	const isDelete = line.type === "remove";

	return (
		<div className="flex">
			<span
				className={cn(
					"inline-block w-5 text-center shrink-0 select-none",
					isAdd
						? "text-success/50"
						: isDelete
							? "text-destructive/50"
							: "text-transparent",
				)}
			>
				{isAdd ? "+" : isDelete ? "-" : " "}
			</span>
			<span className="pl-1">
				{tokens ? (
					line.segments ? (
						<SyntaxSegmentedContent
							segments={line.segments}
							tokens={tokens}
							type={line.type}
						/>
					) : (
						<span className="diff-syntax">
							{tokens.map((token, index) => (
								<span
									key={index}
									style={{
										color: `light-dark(${token.lightColor}, ${token.darkColor})`,
									}}
								>
									{token.text}
								</span>
							))}
						</span>
					)
				) : line.segments ? (
					<SegmentedContent
						segments={line.segments}
						type={line.type}
					/>
				) : (
					<span
						className={cn(
							isAdd && "text-diff-add-text",
							isDelete && "text-diff-del-text",
						)}
					>
						{line.content}
					</span>
				)}
			</span>
		</div>
	);
}

function getExpandedContextStartLine(
	hunkInfos: DiffViewportHunkInfo[],
	hunkIndex: number | undefined,
) {
	if (hunkIndex === undefined) return 1;
	const previousHunk = hunkInfos.filter((hunk) => hunk.index < hunkIndex).pop();
	return previousHunk ? previousHunk.endNewLine + 1 : 1;
}
