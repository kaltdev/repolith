import { prisma } from "./db";
import {
	buildPRReviewFileFingerprint,
	buildPRReviewLineFingerprint,
} from "./pr-review-fingerprints";
import { generatePRReviewChecklist } from "./pr-review-checklist";
import type {
	PRReviewChecklistItemState,
	PRReviewDiffFile,
	PRReviewDraftComment,
	PRReviewDraftCommentStatus,
	PRReviewFileState,
	PRReviewPendingVerdict,
	PRReviewSide,
	PRReviewSuggestion,
	PRReviewSuggestionStatus,
	PRReviewWorkspace,
	PRReviewWorkspacePageData,
	PRReviewWorkspaceRef,
	SetPRReviewChecklistItemStateInput,
	SetPRReviewFileStateInput,
	UpsertPRReviewDraftCommentInput,
	UpsertPRReviewWorkspaceInput,
} from "./pr-review-types";

function nowIso(): string {
	return new Date().toISOString();
}

function buildWorkspaceWhere(input: {
	userId: string;
	owner: string;
	repo: string;
	pullNumber: number;
}) {
	return {
		userId_owner_repo_pullNumber: {
			userId: input.userId,
			owner: input.owner,
			repo: input.repo,
			pullNumber: input.pullNumber,
		},
	};
}

function mapWorkspace(row: {
	id: string;
	userId: string;
	owner: string;
	repo: string;
	pullNumber: number;
	headSha: string;
	baseSha: string;
	draftBody: string | null;
	pendingVerdict: string | null;
	hideViewedFiles: boolean;
	splitView: boolean | null;
	wordWrap: boolean | null;
	defaultViewMode: string | null;
	fontSize: string | null;
	showFolderDiffCount: boolean | null;
	createdAt: string;
	updatedAt: string;
}): PRReviewWorkspace {
	return {
		id: row.id,
		userId: row.userId,
		owner: row.owner,
		repo: row.repo,
		pullNumber: row.pullNumber,
		headSha: row.headSha,
		baseSha: row.baseSha,
		draftBody: row.draftBody,
		pendingVerdict: row.pendingVerdict as PRReviewPendingVerdict | null,
		hideViewedFiles: row.hideViewedFiles,
		splitView: row.splitView,
		wordWrap: row.wordWrap,
		defaultViewMode: row.defaultViewMode,
		fontSize: row.fontSize,
		showFolderDiffCount: row.showFolderDiffCount,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapSuggestion(
	row: {
		id: string;
		workspaceId: string;
		draftCommentId: string | null;
		githubCommentId: number | null;
		path: string;
		side: string;
		startLine: number;
		endLine: number;
		originalCode: string;
		suggestedCode: string;
		originalFingerprint: string;
		status: string;
		applyDisabledReason: string | null;
		appliedCommitSha: string | null;
		appliedAt: string | null;
		createdAt: string;
		updatedAt: string;
	},
	isStale: boolean,
): PRReviewSuggestion {
	return {
		id: row.id,
		workspaceId: row.workspaceId,
		draftCommentId: row.draftCommentId,
		githubCommentId: row.githubCommentId,
		path: row.path,
		side: row.side as PRReviewSide,
		startLine: row.startLine,
		endLine: row.endLine,
		originalCode: row.originalCode,
		suggestedCode: row.suggestedCode,
		originalFingerprint: row.originalFingerprint,
		status: row.status as PRReviewSuggestionStatus,
		applyDisabledReason: row.applyDisabledReason,
		appliedCommitSha: row.appliedCommitSha,
		appliedAt: row.appliedAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		isStale,
	};
}

function mapDraftComment(
	row: {
		id: string;
		workspaceId: string;
		path: string;
		side: string | null;
		startLine: number | null;
		endLine: number | null;
		lineFingerprint: string | null;
		headSha: string;
		body: string;
		threadId: string | null;
		replyToCommentId: number | null;
		status: string;
		createdAt: string;
		updatedAt: string;
		suggestions: Array<{
			id: string;
			workspaceId: string;
			draftCommentId: string | null;
			githubCommentId: number | null;
			path: string;
			side: string;
			startLine: number;
			endLine: number;
			originalCode: string;
			suggestedCode: string;
			originalFingerprint: string;
			status: string;
			applyDisabledReason: string | null;
			appliedCommitSha: string | null;
			appliedAt: string | null;
			createdAt: string;
			updatedAt: string;
		}>;
	},
	filesByPath: Map<string, PRReviewDiffFile>,
	currentHeadSha: string,
): PRReviewDraftComment {
	const currentFile = filesByPath.get(row.path);
	const currentFingerprint =
		currentFile && row.side != null && row.startLine != null && row.endLine != null
			? buildPRReviewLineFingerprint({
					file: currentFile,
					startLine: row.startLine,
					endLine: row.endLine,
					side: row.side as PRReviewSide,
				})
			: null;
	const isStale =
		row.status === "stale" ||
		row.headSha !== currentHeadSha ||
		(row.lineFingerprint != null && currentFingerprint !== row.lineFingerprint);

	return {
		id: row.id,
		workspaceId: row.workspaceId,
		path: row.path,
		side: row.side as PRReviewSide | null,
		startLine: row.startLine,
		endLine: row.endLine,
		lineFingerprint: row.lineFingerprint,
		headSha: row.headSha,
		body: row.body,
		threadId: row.threadId,
		replyToCommentId: row.replyToCommentId,
		status: row.status as PRReviewDraftCommentStatus,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		suggestions: row.suggestions.map((suggestion) => {
			const suggestionFile = filesByPath.get(suggestion.path);
			const currentSuggestionFingerprint =
				suggestionFile != null
					? buildPRReviewLineFingerprint({
							file: suggestionFile,
							startLine: suggestion.startLine,
							endLine: suggestion.endLine,
							side: suggestion.side as PRReviewSide,
						})
					: null;
			return mapSuggestion(
				suggestion,
				isStale ||
					currentSuggestionFingerprint !==
						suggestion.originalFingerprint,
			);
		}),
		isStale,
	};
}

function mapFileState(
	row: {
		id: string;
		userId: string;
		owner: string;
		repo: string;
		pullNumber: number;
		path: string;
		fileFingerprint: string;
		viewed: boolean;
		lastViewedAt: string | null;
		createdAt: string;
		updatedAt: string;
	},
	filesByPath: Map<string, PRReviewDiffFile>,
): PRReviewFileState {
	const currentFile = filesByPath.get(row.path);
	const currentFingerprint = currentFile ? buildPRReviewFileFingerprint(currentFile) : null;

	return {
		id: row.id,
		userId: row.userId,
		owner: row.owner,
		repo: row.repo,
		pullNumber: row.pullNumber,
		path: row.path,
		fileFingerprint: row.fileFingerprint,
		viewed: row.viewed,
		lastViewedAt: row.lastViewedAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		isStale: currentFingerprint !== row.fileFingerprint,
	};
}

export async function getPRReviewWorkspace(
	input: Pick<PRReviewWorkspaceRef, "userId" | "owner" | "repo" | "pullNumber">,
): Promise<PRReviewWorkspace | null> {
	const row = await prisma.pullRequestReviewWorkspace.findUnique({
		where: buildWorkspaceWhere(input),
	});

	return row ? mapWorkspace(row) : null;
}

export async function ensurePRReviewWorkspace(
	input: PRReviewWorkspaceRef,
): Promise<PRReviewWorkspace> {
	const now = nowIso();

	const row = await prisma.pullRequestReviewWorkspace.upsert({
		where: buildWorkspaceWhere(input),
		create: {
			id: crypto.randomUUID(),
			userId: input.userId,
			owner: input.owner,
			repo: input.repo,
			pullNumber: input.pullNumber,
			headSha: input.headSha,
			baseSha: input.baseSha,
			createdAt: now,
			updatedAt: now,
		},
		update: {
			headSha: input.headSha,
			baseSha: input.baseSha,
			updatedAt: now,
		},
	});

	return mapWorkspace(row);
}

export async function savePRReviewWorkspaceDraft(
	input: UpsertPRReviewWorkspaceInput,
): Promise<PRReviewWorkspace> {
	const existing = await ensurePRReviewWorkspace(input);
	const now = nowIso();
	const data: Record<string, unknown> = {
		headSha: input.headSha,
		baseSha: input.baseSha,
		updatedAt: now,
	};

	if (input.draftBody !== undefined) data.draftBody = input.draftBody;
	if (input.pendingVerdict !== undefined) data.pendingVerdict = input.pendingVerdict;
	if (input.hideViewedFiles !== undefined) data.hideViewedFiles = input.hideViewedFiles;
	if (input.splitView !== undefined) data.splitView = input.splitView;
	if (input.wordWrap !== undefined) data.wordWrap = input.wordWrap;
	if (input.defaultViewMode !== undefined) data.defaultViewMode = input.defaultViewMode;
	if (input.fontSize !== undefined) data.fontSize = input.fontSize;
	if (input.showFolderDiffCount !== undefined) {
		data.showFolderDiffCount = input.showFolderDiffCount;
	}

	const row = await prisma.pullRequestReviewWorkspace.update({
		where: { id: existing.id },
		data,
	});

	return mapWorkspace(row);
}

export async function upsertPRReviewDraftComment(
	input: UpsertPRReviewDraftCommentInput,
): Promise<PRReviewDraftComment> {
	const workspace = await ensurePRReviewWorkspace(input);
	const now = nowIso();
	const commentId = input.id ?? crypto.randomUUID();

	await prisma.$transaction(async (tx) => {
		if (input.id) {
			await tx.pullRequestDraftComment.updateMany({
				where: {
					id: input.id,
					workspaceId: workspace.id,
				},
				data: {
					path: input.path,
					side: input.side ?? null,
					startLine: input.startLine ?? null,
					endLine: input.endLine ?? null,
					lineFingerprint: input.lineFingerprint ?? null,
					headSha: input.headSha,
					body: input.body,
					threadId: input.threadId ?? null,
					replyToCommentId: input.replyToCommentId ?? null,
					status: input.status ?? "active",
					updatedAt: now,
				},
			});
		} else {
			await tx.pullRequestDraftComment.create({
				data: {
					id: commentId,
					workspaceId: workspace.id,
					path: input.path,
					side: input.side ?? null,
					startLine: input.startLine ?? null,
					endLine: input.endLine ?? null,
					lineFingerprint: input.lineFingerprint ?? null,
					headSha: input.headSha,
					body: input.body,
					threadId: input.threadId ?? null,
					replyToCommentId: input.replyToCommentId ?? null,
					status: input.status ?? "active",
					createdAt: now,
					updatedAt: now,
				},
			});
		}

		if (input.suggestions !== undefined) {
			await tx.pullRequestSuggestion.deleteMany({
				where: {
					workspaceId: workspace.id,
					draftCommentId: commentId,
					githubCommentId: null,
					appliedCommitSha: null,
				},
			});

			if (input.suggestions.length > 0) {
				await Promise.all(
					input.suggestions.map((suggestion) =>
						tx.pullRequestSuggestion.create({
							data: {
								id: crypto.randomUUID(),
								workspaceId: workspace.id,
								draftCommentId: commentId,
								githubCommentId:
									suggestion.githubCommentId ??
									null,
								path: suggestion.path,
								side: suggestion.side ?? "RIGHT",
								startLine: suggestion.startLine,
								endLine: suggestion.endLine,
								originalCode:
									suggestion.originalCode,
								suggestedCode:
									suggestion.suggestedCode,
								originalFingerprint:
									suggestion.originalFingerprint,
								status:
									suggestion.status ??
									"draft",
								applyDisabledReason:
									suggestion.applyDisabledReason ??
									null,
								createdAt: now,
								updatedAt: now,
							},
						}),
					),
				);
			}
		}

		await tx.pullRequestReviewWorkspace.update({
			where: { id: workspace.id },
			data: {
				headSha: input.headSha,
				baseSha: input.baseSha,
				updatedAt: now,
			},
		});
	});

	const row = await prisma.pullRequestDraftComment.findUniqueOrThrow({
		where: { id: commentId },
		include: {
			suggestions: {
				orderBy: { createdAt: "asc" },
			},
		},
	});

	return mapDraftComment(row, new Map<string, PRReviewDiffFile>(), input.headSha);
}

export async function deletePRReviewDraftComment(
	userId: string,
	owner: string,
	repo: string,
	pullNumber: number,
	commentId: string,
): Promise<void> {
	const workspace = await getPRReviewWorkspace({ userId, owner, repo, pullNumber });
	if (!workspace) return;

	await prisma.$transaction([
		prisma.pullRequestSuggestion.deleteMany({
			where: {
				workspaceId: workspace.id,
				draftCommentId: commentId,
				githubCommentId: null,
				appliedCommitSha: null,
			},
		}),
		prisma.pullRequestDraftComment.deleteMany({
			where: {
				id: commentId,
				workspaceId: workspace.id,
			},
		}),
	]);
}

export async function deletePRReviewDraftComments(
	userId: string,
	owner: string,
	repo: string,
	pullNumber: number,
	commentIds: string[],
): Promise<void> {
	if (commentIds.length === 0) return;

	const workspace = await getPRReviewWorkspace({ userId, owner, repo, pullNumber });
	if (!workspace) return;

	await prisma.$transaction([
		prisma.pullRequestSuggestion.deleteMany({
			where: {
				workspaceId: workspace.id,
				draftCommentId: { in: commentIds },
				githubCommentId: null,
				appliedCommitSha: null,
			},
		}),
		prisma.pullRequestDraftComment.deleteMany({
			where: {
				workspaceId: workspace.id,
				id: { in: commentIds },
			},
		}),
	]);
}

export async function clearPRReviewWorkspaceReviewState(
	userId: string,
	owner: string,
	repo: string,
	pullNumber: number,
): Promise<void> {
	const workspace = await getPRReviewWorkspace({ userId, owner, repo, pullNumber });
	if (!workspace) return;

	await prisma.pullRequestReviewWorkspace.update({
		where: { id: workspace.id },
		data: {
			draftBody: null,
			pendingVerdict: null,
			updatedAt: nowIso(),
		},
	});
}

export async function getPRReviewSuggestionById(
	userId: string,
	suggestionId: string,
): Promise<{
	id: string;
	path: string;
	side: PRReviewSide;
	startLine: number;
	endLine: number;
	suggestedCode: string;
	originalFingerprint: string;
	status: PRReviewSuggestionStatus;
	applyDisabledReason: string | null;
	appliedCommitSha: string | null;
	workspace: {
		userId: string;
		owner: string;
		repo: string;
		pullNumber: number;
	};
} | null> {
	const row = await prisma.pullRequestSuggestion.findUnique({
		where: { id: suggestionId },
		include: {
			workspace: true,
		},
	});

	if (!row || row.workspace.userId !== userId) {
		return null;
	}

	return {
		id: row.id,
		path: row.path,
		side: row.side as PRReviewSide,
		startLine: row.startLine,
		endLine: row.endLine,
		suggestedCode: row.suggestedCode,
		originalFingerprint: row.originalFingerprint,
		status: row.status as PRReviewSuggestionStatus,
		applyDisabledReason: row.applyDisabledReason,
		appliedCommitSha: row.appliedCommitSha,
		workspace: {
			userId: row.workspace.userId,
			owner: row.workspace.owner,
			repo: row.workspace.repo,
			pullNumber: row.workspace.pullNumber,
		},
	};
}

export async function markPRReviewSuggestionStatus(
	userId: string,
	suggestionId: string,
	input: {
		status: PRReviewSuggestionStatus;
		applyDisabledReason?: string | null;
		appliedCommitSha?: string | null;
	},
): Promise<void> {
	const suggestion = await getPRReviewSuggestionById(userId, suggestionId);
	if (!suggestion) return;

	await prisma.pullRequestSuggestion.update({
		where: { id: suggestionId },
		data: {
			status: input.status,
			applyDisabledReason:
				input.applyDisabledReason === undefined
					? suggestion.applyDisabledReason
					: input.applyDisabledReason,
			appliedCommitSha:
				input.appliedCommitSha === undefined
					? suggestion.appliedCommitSha
					: input.appliedCommitSha,
			appliedAt: input.status === "applied" ? nowIso() : null,
			updatedAt: nowIso(),
		},
	});
}

export async function setPRReviewFileState(
	input: SetPRReviewFileStateInput,
): Promise<PRReviewFileState> {
	const now = nowIso();
	const row = await prisma.pullRequestReviewerFileState.upsert({
		where: {
			userId_owner_repo_pullNumber_path: {
				userId: input.userId,
				owner: input.owner,
				repo: input.repo,
				pullNumber: input.pullNumber,
				path: input.path,
			},
		},
		create: {
			id: crypto.randomUUID(),
			userId: input.userId,
			owner: input.owner,
			repo: input.repo,
			pullNumber: input.pullNumber,
			path: input.path,
			fileFingerprint: input.fileFingerprint,
			viewed: input.viewed,
			lastViewedAt: input.viewed ? now : null,
			createdAt: now,
			updatedAt: now,
		},
		update: {
			fileFingerprint: input.fileFingerprint,
			viewed: input.viewed,
			lastViewedAt: input.viewed ? now : null,
			updatedAt: now,
		},
	});

	return {
		id: row.id,
		userId: row.userId,
		owner: row.owner,
		repo: row.repo,
		pullNumber: row.pullNumber,
		path: row.path,
		fileFingerprint: row.fileFingerprint,
		viewed: row.viewed,
		lastViewedAt: row.lastViewedAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		isStale: false,
	};
}

export async function setPRReviewFileStates(
	inputs: SetPRReviewFileStateInput[],
): Promise<PRReviewFileState[]> {
	if (inputs.length === 0) return [];

	const now = nowIso();
	const rows = await prisma.$transaction(
		inputs.map((input) =>
			prisma.pullRequestReviewerFileState.upsert({
				where: {
					userId_owner_repo_pullNumber_path: {
						userId: input.userId,
						owner: input.owner,
						repo: input.repo,
						pullNumber: input.pullNumber,
						path: input.path,
					},
				},
				create: {
					id: crypto.randomUUID(),
					userId: input.userId,
					owner: input.owner,
					repo: input.repo,
					pullNumber: input.pullNumber,
					path: input.path,
					fileFingerprint: input.fileFingerprint,
					viewed: input.viewed,
					lastViewedAt: input.viewed ? now : null,
					createdAt: now,
					updatedAt: now,
				},
				update: {
					fileFingerprint: input.fileFingerprint,
					viewed: input.viewed,
					lastViewedAt: input.viewed ? now : null,
					updatedAt: now,
				},
			}),
		),
	);

	return rows.map((row) => ({
		id: row.id,
		userId: row.userId,
		owner: row.owner,
		repo: row.repo,
		pullNumber: row.pullNumber,
		path: row.path,
		fileFingerprint: row.fileFingerprint,
		viewed: row.viewed,
		lastViewedAt: row.lastViewedAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		isStale: false,
	}));
}

export async function setPRReviewChecklistItemState(
	input: SetPRReviewChecklistItemStateInput,
): Promise<void> {
	const now = nowIso();

	await prisma.pullRequestChecklistState.upsert({
		where: {
			userId_owner_repo_pullNumber_itemKey: {
				userId: input.userId,
				owner: input.owner,
				repo: input.repo,
				pullNumber: input.pullNumber,
				itemKey: input.itemKey,
			},
		},
		create: {
			id: crypto.randomUUID(),
			userId: input.userId,
			owner: input.owner,
			repo: input.repo,
			pullNumber: input.pullNumber,
			itemKey: input.itemKey,
			itemFingerprint: input.itemFingerprint,
			checked: input.checked,
			createdAt: now,
			updatedAt: now,
		},
		update: {
			itemFingerprint: input.itemFingerprint,
			checked: input.checked,
			updatedAt: now,
		},
	});
}

export async function getPRReviewWorkspacePageData({
	userId,
	owner,
	repo,
	pullNumber,
	headSha,
	baseSha: _baseSha,
	files,
}: {
	userId?: string | null;
	owner: string;
	repo: string;
	pullNumber: number;
	headSha: string;
	baseSha: string;
	files: PRReviewDiffFile[];
}): Promise<PRReviewWorkspacePageData> {
	const filesByPath = new Map<string, PRReviewDiffFile>(
		files.map((file) => [
			file.filename,
			{
				...file,
				previousFilename: file.previousFilename ?? null,
			},
		]),
	);
	const checklistItems = generatePRReviewChecklist(files);

	if (!userId) {
		return {
			workspace: null,
			draftComments: [],
			fileStates: [],
			checklistItems: checklistItems.map<PRReviewChecklistItemState>((item) => ({
				...item,
				checked: false,
				persisted: false,
				isStaleState: false,
				updatedAt: null,
			})),
		};
	}

	const [workspaceRow, fileStateRows, checklistStateRows] = await Promise.all([
		prisma.pullRequestReviewWorkspace.findUnique({
			where: buildWorkspaceWhere({ userId, owner, repo, pullNumber }),
			include: {
				draftComments: {
					orderBy: { createdAt: "asc" },
					include: {
						suggestions: {
							orderBy: { createdAt: "asc" },
						},
					},
				},
			},
		}),
		prisma.pullRequestReviewerFileState.findMany({
			where: { userId, owner, repo, pullNumber },
			orderBy: { updatedAt: "desc" },
		}),
		prisma.pullRequestChecklistState.findMany({
			where: { userId, owner, repo, pullNumber },
			orderBy: { updatedAt: "desc" },
		}),
	]);

	const mergedChecklist = checklistItems.map<PRReviewChecklistItemState>((item) => {
		const persisted =
			checklistStateRows.find((row) => row.itemKey === item.key) ?? null;
		const isStaleState = !!persisted && persisted.itemFingerprint !== item.fingerprint;

		return {
			...item,
			checked: !!persisted?.checked && !isStaleState,
			persisted: persisted != null,
			isStaleState,
			updatedAt: persisted?.updatedAt ?? null,
		};
	});

	return {
		workspace: workspaceRow ? mapWorkspace(workspaceRow) : null,
		draftComments:
			workspaceRow?.draftComments.map((comment) =>
				mapDraftComment(comment, filesByPath, headSha),
			) ?? [],
		fileStates: fileStateRows.map((row) => mapFileState(row, filesByPath)),
		checklistItems: mergedChecklist,
	};
}
