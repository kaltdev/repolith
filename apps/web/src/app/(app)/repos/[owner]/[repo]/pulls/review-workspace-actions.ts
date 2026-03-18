"use server";

import { revalidatePath } from "next/cache";
import { commitSuggestion } from "@/app/(app)/repos/[owner]/[repo]/pulls/pr-actions";
import { getOctokit, getPullRequestBundle, getPullRequestFiles } from "@/lib/github";
import { buildPRReviewLineFingerprint } from "@/lib/pr-review-fingerprints";
import { getErrorMessage } from "@/lib/utils";
import { getServerSession } from "@/lib/auth";
import {
	clearPRReviewWorkspaceReviewState,
	deletePRReviewDraftComments,
	deletePRReviewDraftComment,
	getPRReviewSuggestionById,
	getPRReviewWorkspacePageData,
	markPRReviewSuggestionStatus,
	savePRReviewWorkspaceDraft,
	setPRReviewChecklistItemState,
	setPRReviewFileState,
	setPRReviewFileStates,
	upsertPRReviewDraftComment,
} from "@/lib/pr-review-workspace";
import type {
	ApplyPRReviewSuggestionResult,
	PRReviewWorkspace,
	SubmitPRReviewWorkspaceResult,
	SetPRReviewChecklistItemStateInput,
	SetPRReviewFileStateInput,
	UpsertPRReviewDraftCommentInput,
	UpsertPRReviewWorkspaceInput,
} from "@/lib/pr-review-types";

interface ActionSuccess<T> {
	success: true;
	data: T;
}

interface ActionError {
	error: string;
}

type ActionResult<T> = ActionSuccess<T> | ActionError;

function buildPRPath(owner: string, repo: string, pullNumber: number): string {
	return `/repos/${owner}/${repo}/pulls/${pullNumber}`;
}

async function requireSessionUserId(): Promise<string> {
	const session = await getServerSession();
	if (!session?.user?.id) throw new Error("Unauthorized");
	return session.user.id;
}

async function loadCurrentPRReviewWorkspacePageData(
	userId: string,
	owner: string,
	repo: string,
	pullNumber: number,
) {
	const [bundle, files] = await Promise.all([
		getPullRequestBundle(owner, repo, pullNumber),
		getPullRequestFiles(owner, repo, pullNumber),
	]);

	if (!bundle) {
		throw new Error("Pull request not found");
	}

	const pageData = await getPRReviewWorkspacePageData({
		userId,
		owner,
		repo,
		pullNumber,
		headSha: bundle.pr.head.sha,
		baseSha: bundle.pr.base.sha,
		files: (files ?? []).map((file) => ({
			filename: file.filename,
			status: file.status,
			additions: file.additions,
			deletions: file.deletions,
			patch: file.patch,
			previousFilename: file.previous_filename ?? null,
		})),
	});

	return { bundle, pageData, files: files ?? [] };
}

export async function savePRReviewWorkspaceDraftAction(
	input: Omit<UpsertPRReviewWorkspaceInput, "userId">,
): Promise<ActionResult<PRReviewWorkspace>> {
	try {
		const userId = await requireSessionUserId();
		const data = await savePRReviewWorkspaceDraft({ ...input, userId });
		revalidatePath(buildPRPath(input.owner, input.repo, input.pullNumber));
		return { success: true, data };
	} catch (error) {
		return { error: getErrorMessage(error) || "Failed to save review draft" };
	}
}

export async function upsertPRReviewDraftCommentAction(
	input: Omit<UpsertPRReviewDraftCommentInput, "userId">,
): Promise<ActionResult<Awaited<ReturnType<typeof upsertPRReviewDraftComment>>>> {
	try {
		const userId = await requireSessionUserId();
		const data = await upsertPRReviewDraftComment({ ...input, userId });
		revalidatePath(buildPRPath(input.owner, input.repo, input.pullNumber));
		return { success: true, data };
	} catch (error) {
		return { error: getErrorMessage(error) || "Failed to save draft comment" };
	}
}

export async function deletePRReviewDraftCommentAction(
	owner: string,
	repo: string,
	pullNumber: number,
	commentId: string,
): Promise<ActionResult<null>> {
	try {
		const userId = await requireSessionUserId();
		await deletePRReviewDraftComment(userId, owner, repo, pullNumber, commentId);
		revalidatePath(buildPRPath(owner, repo, pullNumber));
		return { success: true, data: null };
	} catch (error) {
		return { error: getErrorMessage(error) || "Failed to delete draft comment" };
	}
}

export async function setPRReviewFileStateAction(
	input: Omit<SetPRReviewFileStateInput, "userId">,
): Promise<ActionResult<Awaited<ReturnType<typeof setPRReviewFileState>>>> {
	try {
		const userId = await requireSessionUserId();
		const data = await setPRReviewFileState({ ...input, userId });
		revalidatePath(buildPRPath(input.owner, input.repo, input.pullNumber));
		return { success: true, data };
	} catch (error) {
		return { error: getErrorMessage(error) || "Failed to update viewed state" };
	}
}

export async function setPRReviewFileStatesAction(
	inputs: Array<Omit<SetPRReviewFileStateInput, "userId">>,
): Promise<ActionResult<Awaited<ReturnType<typeof setPRReviewFileStates>>>> {
	try {
		if (inputs.length === 0) {
			return { success: true, data: [] };
		}
		const userId = await requireSessionUserId();
		const data = await setPRReviewFileStates(
			inputs.map((input) => ({ ...input, userId })),
		);
		revalidatePath(buildPRPath(inputs[0].owner, inputs[0].repo, inputs[0].pullNumber));
		return { success: true, data };
	} catch (error) {
		return { error: getErrorMessage(error) || "Failed to update viewed state" };
	}
}

export async function savePRReviewWorkspacePreferencesAction(
	input: Omit<UpsertPRReviewWorkspaceInput, "userId" | "draftBody" | "pendingVerdict">,
): Promise<ActionResult<PRReviewWorkspace>> {
	try {
		const userId = await requireSessionUserId();
		const data = await savePRReviewWorkspaceDraft({ ...input, userId });
		revalidatePath(buildPRPath(input.owner, input.repo, input.pullNumber));
		return { success: true, data };
	} catch (error) {
		return { error: getErrorMessage(error) || "Failed to save review preferences" };
	}
}

export async function setPRReviewChecklistItemStateAction(
	input: Omit<SetPRReviewChecklistItemStateInput, "userId">,
): Promise<ActionResult<null>> {
	try {
		const userId = await requireSessionUserId();
		await setPRReviewChecklistItemState({ ...input, userId });
		revalidatePath(buildPRPath(input.owner, input.repo, input.pullNumber));
		return { success: true, data: null };
	} catch (error) {
		return { error: getErrorMessage(error) || "Failed to update checklist state" };
	}
}

export async function submitPRReviewWorkspaceAction(
	owner: string,
	repo: string,
	pullNumber: number,
): Promise<ActionResult<SubmitPRReviewWorkspaceResult>> {
	try {
		const userId = await requireSessionUserId();
		const octokit = await getOctokit();
		if (!octokit) {
			return { error: "Not authenticated" };
		}

		const { pageData } = await loadCurrentPRReviewWorkspacePageData(
			userId,
			owner,
			repo,
			pullNumber,
		);
		const workspace = pageData.workspace;
		if (!workspace) {
			return { error: "No draft review found" };
		}

		const activeDrafts = pageData.draftComments.filter(
			(comment) => comment.status === "active",
		);
		const staleDrafts = activeDrafts.filter(
			(comment) =>
				comment.isStale ||
				comment.suggestions.some((suggestion) => suggestion.isStale),
		);
		if (staleDrafts.length > 0) {
			return {
				error: `This review contains ${staleDrafts.length} stale draft item${staleDrafts.length === 1 ? "" : "s"}. Refresh the draft before submitting.`,
			};
		}

		const reviewBody = workspace.draftBody?.trim() || undefined;
		const reviewEvent = workspace.pendingVerdict ?? "COMMENT";
		const topLevelDrafts = activeDrafts.filter(
			(comment) => comment.replyToCommentId == null,
		);
		const replyDrafts = activeDrafts.filter(
			(comment) => comment.replyToCommentId != null,
		);

		if (
			topLevelDrafts.length === 0 &&
			replyDrafts.length === 0 &&
			!reviewBody &&
			workspace.pendingVerdict == null
		) {
			return { error: "Nothing to submit" };
		}

		const publishedTopLevelIds: string[] = [];
		const publishedReplyIds: string[] = [];
		const warnings: string[] = [];
		let reviewSubmitted = false;

		if (topLevelDrafts.length > 0 || reviewBody || workspace.pendingVerdict != null) {
			await octokit.pulls.createReview({
				owner,
				repo,
				pull_number: pullNumber,
				event: reviewEvent,
				...(reviewBody ? { body: reviewBody } : {}),
				...(topLevelDrafts.length > 0
					? {
							comments: topLevelDrafts.map((comment) => ({
								path: comment.path,
								body: comment.body,
								line: comment.endLine!,
								side: (comment.side ?? "RIGHT") as
									| "LEFT"
									| "RIGHT",
								...(comment.startLine != null &&
								comment.endLine != null &&
								comment.startLine !==
									comment.endLine
									? {
											start_line: comment.startLine,
											start_side: (comment.side ??
												"RIGHT") as
												| "LEFT"
												| "RIGHT",
										}
									: {}),
							})),
						}
					: {}),
			});
			reviewSubmitted = true;
			publishedTopLevelIds.push(...topLevelDrafts.map((comment) => comment.id));
			await clearPRReviewWorkspaceReviewState(userId, owner, repo, pullNumber);
		}

		for (const reply of replyDrafts) {
			try {
				await octokit.pulls.createReplyForReviewComment({
					owner,
					repo,
					pull_number: pullNumber,
					comment_id: reply.replyToCommentId!,
					body: reply.body,
				});
				publishedReplyIds.push(reply.id);
			} catch (error) {
				warnings.push(
					`Reply on ${reply.path} could not be published: ${getErrorMessage(error) || "unknown error"}`,
				);
			}
		}

		const successfulDraftIds = [...publishedTopLevelIds, ...publishedReplyIds];
		if (successfulDraftIds.length > 0) {
			await deletePRReviewDraftComments(
				userId,
				owner,
				repo,
				pullNumber,
				successfulDraftIds,
			);
		}

		revalidatePath(buildPRPath(owner, repo, pullNumber));

		if (!reviewSubmitted && successfulDraftIds.length === 0) {
			return {
				error: warnings[0] || "Failed to submit review workspace",
			};
		}

		return {
			success: true,
			data: {
				publishedCommentCount: publishedTopLevelIds.length,
				publishedReplyCount: publishedReplyIds.length,
				remainingDraftCount:
					activeDrafts.length - successfulDraftIds.length,
				warning: warnings.length > 0 ? warnings.join(" ") : null,
			},
		};
	} catch (error) {
		return { error: getErrorMessage(error) || "Failed to submit review workspace" };
	}
}

export async function applyPRReviewSuggestionAction(
	suggestionId: string,
	commitMessage?: string,
): Promise<ActionResult<ApplyPRReviewSuggestionResult>> {
	try {
		const userId = await requireSessionUserId();
		const suggestion = await getPRReviewSuggestionById(userId, suggestionId);
		if (!suggestion) {
			return { error: "Suggestion not found" };
		}

		if (suggestion.status === "applied") {
			return {
				success: true,
				data: { commitSha: suggestion.appliedCommitSha },
			};
		}

		const { bundle, files } = await loadCurrentPRReviewWorkspacePageData(
			userId,
			suggestion.workspace.owner,
			suggestion.workspace.repo,
			suggestion.workspace.pullNumber,
		);

		const currentFile = files.find((file) => file.filename === suggestion.path);
		if (!currentFile) {
			await markPRReviewSuggestionStatus(userId, suggestionId, {
				status: "stale",
				applyDisabledReason:
					"The target file no longer exists in the current diff.",
			});
			return { error: "The target file no longer exists in the current diff" };
		}

		const currentFingerprint = buildPRReviewLineFingerprint({
			file: {
				filename: currentFile.filename,
				status: currentFile.status,
				additions: currentFile.additions,
				deletions: currentFile.deletions,
				patch: currentFile.patch,
				previousFilename: currentFile.previous_filename ?? null,
			},
			startLine: suggestion.startLine,
			endLine: suggestion.endLine,
			side: suggestion.side,
		});

		if (
			currentFingerprint == null ||
			currentFingerprint !== suggestion.originalFingerprint
		) {
			await markPRReviewSuggestionStatus(userId, suggestionId, {
				status: "stale",
				applyDisabledReason:
					"The suggestion target changed after the draft was created.",
			});
			return {
				error: "The suggestion target changed after the draft was created",
			};
		}

		const result = await commitSuggestion(
			suggestion.workspace.owner,
			suggestion.workspace.repo,
			suggestion.workspace.pullNumber,
			suggestion.path,
			bundle.pr.head.ref,
			suggestion.startLine,
			suggestion.endLine,
			suggestion.suggestedCode,
			commitMessage,
		);

		if ("error" in result) {
			await markPRReviewSuggestionStatus(userId, suggestionId, {
				status: "failed",
				applyDisabledReason: result.error,
			});
			return { error: result.error ?? "Failed to apply suggestion" };
		}

		await markPRReviewSuggestionStatus(userId, suggestionId, {
			status: "applied",
			applyDisabledReason: null,
			appliedCommitSha: result.commitSha ?? null,
		});

		revalidatePath(
			buildPRPath(
				suggestion.workspace.owner,
				suggestion.workspace.repo,
				suggestion.workspace.pullNumber,
			),
		);

		return {
			success: true,
			data: { commitSha: result.commitSha ?? null },
		};
	} catch (error) {
		return { error: getErrorMessage(error) || "Failed to apply suggestion" };
	}
}
