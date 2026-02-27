export interface CoAuthor {
	name: string;
	email: string;
}

const CO_AUTHOR_GLOBAL_RE = /^Co-authored-by:\s*(.+?)\s*<([^>]+)>/gim;
const CO_AUTHOR_LINE_RE = /^Co-authored-by:\s*/i;

/**
 * Parse `Co-authored-by: Name <email>` trailers from a commit message.
 * Deduplicates by email (case-insensitive).
 */
export function parseCoAuthors(message: string): CoAuthor[] {
	const seen = new Set<string>();
	const result: CoAuthor[] = [];
	for (const match of message.matchAll(CO_AUTHOR_GLOBAL_RE)) {
		const email = match[2].toLowerCase();
		if (seen.has(email)) continue;
		seen.add(email);
		result.push({ name: match[1], email });
	}
	return result;
}

/**
 * Extract the body of a commit message (everything after the first line),
 * excluding Co-authored-by trailers.
 */
export function getCommitBody(message: string): string {
	const lines = message.split("\n");
	const bodyLines = lines.slice(1);
	return bodyLines
		.filter((line) => !CO_AUTHOR_LINE_RE.test(line))
		.join("\n")
		.trim();
}

/**
 * Get initials from a name, e.g. "John Doe" -> "JD".
 * Falls back to first two characters if single word.
 */
export function getInitials(name: string): string {
	const parts = name.trim().split(/\s+/);
	if (parts.length >= 2) {
		return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
	}
	return name.slice(0, 2).toUpperCase();
}
