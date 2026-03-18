"use client";

import type { DiffSegment } from "@/lib/github-utils";
import type { SyntaxToken } from "@/lib/shiki";
import { cn } from "@/lib/utils";

export function SegmentedContent({
	segments,
	type,
}: {
	segments: DiffSegment[];
	type: "add" | "remove" | "context" | "header";
}) {
	return (
		<>
			{segments.map((segment, index) => (
				<span
					key={index}
					className={cn(
						type === "add" && "text-diff-add-text",
						type === "remove" && "text-diff-del-text",
						segment.highlight &&
							type === "add" &&
							"bg-diff-word-add rounded-[2px] px-[1px] -mx-[1px]",
						segment.highlight &&
							type === "remove" &&
							"bg-diff-word-del rounded-[2px] px-[1px] -mx-[1px]",
					)}
				>
					{segment.text}
				</span>
			))}
		</>
	);
}

export function SyntaxSegmentedContent({
	segments,
	tokens,
	type,
}: {
	segments: DiffSegment[];
	tokens: SyntaxToken[];
	type: "add" | "remove" | "context" | "header";
}) {
	const result: {
		text: string;
		highlight: boolean;
		lightColor: string;
		darkColor: string;
	}[] = [];

	let segmentIndex = 0;
	let segmentCharOffset = 0;
	let tokenIndex = 0;
	let tokenCharOffset = 0;

	while (segmentIndex < segments.length && tokenIndex < tokens.length) {
		const segment = segments[segmentIndex];
		const token = tokens[tokenIndex];
		const segmentRemaining = segment.text.length - segmentCharOffset;
		const tokenRemaining = token.text.length - tokenCharOffset;
		const take = Math.min(segmentRemaining, tokenRemaining);

		if (take > 0) {
			result.push({
				text: token.text.slice(tokenCharOffset, tokenCharOffset + take),
				highlight: segment.highlight,
				lightColor: token.lightColor,
				darkColor: token.darkColor,
			});
		}

		segmentCharOffset += take;
		tokenCharOffset += take;

		if (segmentCharOffset >= segment.text.length) {
			segmentIndex++;
			segmentCharOffset = 0;
		}

		if (tokenCharOffset >= token.text.length) {
			tokenIndex++;
			tokenCharOffset = 0;
		}
	}

	while (tokenIndex < tokens.length) {
		const token = tokens[tokenIndex];
		const text = token.text.slice(tokenCharOffset);
		if (text) {
			result.push({
				text,
				highlight: false,
				lightColor: token.lightColor,
				darkColor: token.darkColor,
			});
		}
		tokenIndex++;
		tokenCharOffset = 0;
	}

	return (
		<span className="diff-syntax">
			{result.map((part, index) => (
				<span
					key={index}
					className={cn(
						part.highlight &&
							type === "add" &&
							"bg-diff-word-add rounded-[2px] px-[1px] -mx-[1px]",
						part.highlight &&
							type === "remove" &&
							"bg-diff-word-del rounded-[2px] px-[1px] -mx-[1px]",
					)}
					style={{
						color: `light-dark(${part.lightColor}, ${part.darkColor})`,
					}}
				>
					{part.text}
				</span>
			))}
		</span>
	);
}
