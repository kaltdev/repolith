export type PRReviewSide = "LEFT" | "RIGHT";

export type PRReviewPendingVerdict = "COMMENT" | "APPROVE" | "REQUEST_CHANGES";

export type PRReviewDraftCommentStatus = "active" | "stale";

export type PRReviewSuggestionStatus =
	| "draft"
	| "published"
	| "applied"
	| "failed"
	| "disabled"
	| "stale";

export interface PRReviewDiffFile {
	filename: string;
	status: string;
	additions: number;
	deletions: number;
	patch?: string;
	previousFilename?: string | null;
}

export interface PRReviewWorkspaceScope {
	owner: string;
	repo: string;
	pullNumber: number;
}

export interface PRReviewWorkspaceRef extends PRReviewWorkspaceScope {
	userId: string;
	headSha: string;
	baseSha: string;
}

export interface PRReviewWorkspacePreferences {
	hideViewedFiles: boolean;
	splitView: boolean | null;
	wordWrap: boolean | null;
	defaultViewMode: string | null;
	fontSize: string | null;
	showFolderDiffCount: boolean | null;
}

export interface PRReviewWorkspace extends PRReviewWorkspaceScope, PRReviewWorkspacePreferences {
	id: string;
	userId: string;
	headSha: string;
	baseSha: string;
	draftBody: string | null;
	pendingVerdict: PRReviewPendingVerdict | null;
	createdAt: string;
	updatedAt: string;
}

export interface PRReviewSuggestion {
	id: string;
	workspaceId: string;
	draftCommentId: string | null;
	githubCommentId: number | null;
	path: string;
	side: PRReviewSide;
	startLine: number;
	endLine: number;
	originalCode: string;
	suggestedCode: string;
	originalFingerprint: string;
	status: PRReviewSuggestionStatus;
	applyDisabledReason: string | null;
	appliedCommitSha: string | null;
	appliedAt: string | null;
	createdAt: string;
	updatedAt: string;
	isStale: boolean;
}

export interface PRReviewDraftComment {
	id: string;
	workspaceId: string;
	path: string;
	side: PRReviewSide | null;
	startLine: number | null;
	endLine: number | null;
	lineFingerprint: string | null;
	headSha: string;
	body: string;
	threadId: string | null;
	replyToCommentId: number | null;
	status: PRReviewDraftCommentStatus;
	createdAt: string;
	updatedAt: string;
	suggestions: PRReviewSuggestion[];
	isStale: boolean;
}

export interface PRReviewFileState extends PRReviewWorkspaceScope {
	id: string;
	userId: string;
	path: string;
	fileFingerprint: string;
	viewed: boolean;
	lastViewedAt: string | null;
	createdAt: string;
	updatedAt: string;
	isStale: boolean;
}

export interface PRReviewChecklistEvidence {
	kind: "file";
	path: string;
	detail?: string;
}

export interface PRReviewChecklistItem {
	key: string;
	label: string;
	reason: string;
	evidence: PRReviewChecklistEvidence[];
	fingerprint: string;
}

export interface PRReviewChecklistItemState extends PRReviewChecklistItem {
	checked: boolean;
	persisted: boolean;
	isStaleState: boolean;
	updatedAt: string | null;
}

export interface PRReviewWorkspacePageData {
	workspace: PRReviewWorkspace | null;
	draftComments: PRReviewDraftComment[];
	fileStates: PRReviewFileState[];
	checklistItems: PRReviewChecklistItemState[];
}

export interface SubmitPRReviewWorkspaceResult {
	publishedCommentCount: number;
	publishedReplyCount: number;
	remainingDraftCount: number;
	warning: string | null;
}

export interface ApplyPRReviewSuggestionResult {
	commitSha: string | null;
}

export interface UpsertPRReviewWorkspaceInput extends PRReviewWorkspaceRef {
	draftBody?: string | null;
	pendingVerdict?: PRReviewPendingVerdict | null;
	hideViewedFiles?: boolean;
	splitView?: boolean | null;
	wordWrap?: boolean | null;
	defaultViewMode?: string | null;
	fontSize?: string | null;
	showFolderDiffCount?: boolean | null;
}

export interface CreatePRReviewSuggestionInput {
	path: string;
	side?: PRReviewSide;
	startLine: number;
	endLine: number;
	originalCode: string;
	suggestedCode: string;
	originalFingerprint: string;
	githubCommentId?: number | null;
	status?: PRReviewSuggestionStatus;
	applyDisabledReason?: string | null;
}

export interface UpsertPRReviewDraftCommentInput extends PRReviewWorkspaceRef {
	id?: string;
	path: string;
	side?: PRReviewSide | null;
	startLine?: number | null;
	endLine?: number | null;
	lineFingerprint?: string | null;
	body: string;
	threadId?: string | null;
	replyToCommentId?: number | null;
	status?: PRReviewDraftCommentStatus;
	suggestions?: CreatePRReviewSuggestionInput[];
}

export interface SetPRReviewFileStateInput extends PRReviewWorkspaceScope {
	userId: string;
	path: string;
	fileFingerprint: string;
	viewed: boolean;
}

export interface SetPRReviewChecklistItemStateInput extends PRReviewWorkspaceScope {
	userId: string;
	itemKey: string;
	itemFingerprint: string;
	checked: boolean;
}
