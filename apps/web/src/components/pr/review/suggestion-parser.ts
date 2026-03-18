export interface ParsedSuggestionBlock {
	before: string;
	suggestion: string;
	after: string;
}

export function parseSuggestionBlock(body: string): ParsedSuggestionBlock | null {
	const match = body.match(/```suggestion\n([\s\S]*?)```/);
	if (!match) return null;
	const index = match.index ?? 0;

	return {
		before: body.slice(0, index).trim(),
		suggestion: match[1].replace(/\n$/, ""),
		after: body.slice(index + match[0].length).trim(),
	};
}
