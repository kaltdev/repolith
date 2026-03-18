import type { PRReviewSuggestion } from "@/lib/pr-review-types";

export interface PRDiffFile {
	filename: string;
	status: string;
	additions: number;
	deletions: number;
	patch?: string;
	previous_filename?: string;
}

export interface PRReviewComment {
	id: number | string;
	user: { login: string; avatar_url: string } | null;
	body: string;
	path: string;
	line: number | null;
	start_line?: number | null;
	original_line: number | null;
	side: string | null;
	created_at: string;
	isDraft?: boolean;
	isStale?: boolean;
	replyToCommentId?: number | null;
	suggestions?: PRReviewSuggestion[];
}

export interface PRReviewSummary {
	id: number;
	user: { login: string; avatar_url: string } | null;
	state: string;
	submitted_at: string | null;
}

export type AddContextCallback = (context: {
	filename: string;
	startLine: number;
	endLine: number;
	selectedCode: string;
	side: "LEFT" | "RIGHT";
}) => void;
