# PR Review Experience Design

Date: 2026-03-18
Status: Approved for planning

## Summary

Repolith will upgrade pull request review from a mostly GitHub-backed comment surface into a hybrid review workspace that supports durable private drafts, reviewer-specific progress tracking, stronger diff navigation, and production-grade inline suggestions.

Published review artifacts will continue to use GitHub as the source of truth for comments, threads, review state, and branch commits. Repolith will add a private reviewer workspace in Postgres for the review state that GitHub does not model well: staged comments, pending verdict, checklist progress, viewed files, persisted diff preferences, and durable suggestion metadata.

This design keeps the existing strengths of the current PR detail page while fixing the largest UX gaps relative to GitHub:

- inline code suggestions with durable metadata and one-click apply when permitted
- dynamic review checklists derived from changed files
- reliable split diff and unified diff parity
- per-file viewed state with hide-viewed filtering
- private draft reviews with staged comments and batch submission
- keyboard-driven navigation across files and unresolved work

## Goals

- Add inline code suggestions that persist explicit metadata for file path, selected line range, and suggested code.
- Allow one-click suggestion apply to the PR branch when the reviewer has permission to push to the PR head branch.
- Show a dynamic review checklist in the PR sidebar with per-reviewer persisted state.
- Make split diff and unified diff render from the same normalized diff model so comments and navigation work consistently in both modes.
- Persist reviewer-specific file viewed state and allow hiding viewed files.
- Support private server-saved draft reviews with staged inline comments, replies, and batch submission.
- Improve review thread UX with collapse, expand, resolve, unresolve, and resolved styling.
- Add reliable keyboard navigation for files, changes, and unresolved review work.
- Keep the backend modular enough to scale without turning the PR detail page into a single giant mutation surface.

## Non-Goals

- Replacing GitHub as the canonical store for published review comments or final review state
- Building team-visible live drafts before review submission
- Creating a fallback patch branch when the reviewer cannot push to the PR head branch
- Shipping full real-time collaboration over WebSockets in this pass
- Adding AI-generated review feedback as a required dependency for checklist generation or suggestions
- Rewriting unrelated PR overview or repository layout flows

## Scope

This design covers the PR detail experience under:

- [`apps/web/src/app/(app)/repos/[owner]/[repo]/pulls/[number]/page.tsx`](../../../apps/web/src/app/(app)/repos/[owner]/[repo]/pulls/[number]/page.tsx)
- [`apps/web/src/components/pr/pr-diff-viewer.tsx`](../../../apps/web/src/components/pr/pr-diff-viewer.tsx)
- [`apps/web/src/components/pr/pr-review-form.tsx`](../../../apps/web/src/components/pr/pr-review-form.tsx)
- [`apps/web/src/components/pr/pr-reviews-panel.tsx`](../../../apps/web/src/components/pr/pr-reviews-panel.tsx)
- [`apps/web/src/app/(app)/repos/[owner]/[repo]/pulls/pr-actions.ts`](../../../apps/web/src/app/(app)/repos/[owner]/[repo]/pulls/pr-actions.ts)
- [`apps/web/prisma/schema.prisma`](../../../apps/web/prisma/schema.prisma)

In scope:

- reviewer-local PR workspace persistence
- draft review staging and submission
- inline suggestion storage and apply flow
- checklist generation and persistence
- viewed file persistence and filtering
- split and unified diff parity
- review thread UX improvements
- file and change navigation shortcuts

Out of scope:

- replacing the GitHub timeline model
- large visual redesigns unrelated to review ergonomics
- repository-wide real-time presence systems

## Current State

The current PR experience already contains some important primitives:

- a large client diff viewer with split-view support and inline comments in [`apps/web/src/components/pr/pr-diff-viewer.tsx`](../../../apps/web/src/components/pr/pr-diff-viewer.tsx)
- GitHub-backed server actions for review comments, review submission, suggestion commit, and thread resolve or unresolve in [`apps/web/src/app/(app)/repos/[owner]/[repo]/pulls/pr-actions.ts`](../../../apps/web/src/app/(app)/repos/[owner]/[repo]/pulls/pr-actions.ts)
- local diff preferences in [`apps/web/src/lib/diff-preferences.ts`](../../../apps/web/src/lib/diff-preferences.ts)
- mutation event fanout for PR mutations in [`apps/web/src/lib/mutation-events.ts`](../../../apps/web/src/lib/mutation-events.ts)

The main gaps are architectural rather than purely visual:

- inline comments publish immediately instead of staging into a private draft review
- suggestion rendering is largely parsed from markdown comment bodies and is not modeled durably in the backend
- viewed file state is UI-local rather than per-user durable state
- split diff and navigation behavior live inside a monolithic diff component with too many responsibilities
- checklist generation does not yet exist
- review submission is still a single-shot GitHub mutation instead of a workspace submit flow

## Core Decisions

### 1. Use a hybrid source-of-truth model

GitHub remains authoritative for:

- published review comments
- published threads and their resolved state
- final review submission state
- commits applied to the PR branch

Repolith becomes authoritative for reviewer-private workflow state:

- staged inline comments and replies
- draft top-level review body and pending verdict
- checklist completion state
- file viewed state
- user diff display preferences that should restore across sessions
- durable suggestion metadata and apply status

The governing rule is simple:

- published state lives in GitHub
- private workflow state lives in Repolith

### 2. Draft reviews are private and server-saved

Draft review state will be persisted in Postgres and restored across refreshes and devices for the same reviewer.

Private draft state includes:

- staged comments
- staged replies
- draft review body
- pending review verdict
- checklist state
- viewed files
- hide-viewed preference and review-display preferences

These drafts are visible only to the reviewer who created them until review submission succeeds.

### 3. Suggestion apply is permission-aware

One-click apply is supported only when the reviewer can push to the PR head branch.

If the reviewer cannot push:

- the suggestion still renders normally
- the diff preview remains available
- the apply button is disabled
- the UI explains that the reviewer lacks permission to apply directly to the PR branch

This is intentionally narrower than creating fallback branches or follow-up PRs.

### 4. Draft state must survive diff drift safely

Any staged comment, reply target, or suggestion whose line range no longer matches the current diff snapshot becomes `stale` instead of being silently published against moved code.

This applies when:

- the PR `headSha` changes
- the file patch changes enough to invalidate the stored fingerprint
- the targeted line range no longer maps cleanly to the same logical code

Stale review items remain visible to the reviewer for recovery or deletion.

## Context And External Guidance

Relevant stack versions in this repo:

- Next.js `16.1.6`
- React `19.2.4`
- Prisma `7.4.1`

Context7 guidance supports the main implementation direction:

- Next.js App Router server actions should use cache invalidation such as `revalidatePath()` for post-mutation refresh.
- React `useOptimistic` is appropriate for immediate UI feedback while server mutations persist reviewer-local state.

That guidance aligns with the existing server-action architecture already present in the PR routes.

## Review Workspace Data Model

The review workspace should be modeled in Prisma with small focused tables instead of adding more serialized state into existing GitHub cache records.

### PullRequestReviewWorkspace

Private per reviewer and PR.

Fields:

- `id`
- `userId`
- `owner`
- `repo`
- `pullNumber`
- `headSha`
- `baseSha`
- `draftBody`
- `pendingVerdict`
- `hideViewedFiles`
- `diffViewPreference`
- `createdAt`
- `updatedAt`

Constraints:

- unique on `userId + owner + repo + pullNumber`

Purpose:

- anchors all private review state for one reviewer on one PR
- stores lightweight review-wide preferences and pending verdict

### PullRequestDraftComment

One row per staged inline comment or reply.

Fields:

- `id`
- `workspaceId`
- `path`
- `side`
- `startLine`
- `endLine`
- `lineFingerprint`
- `headSha`
- `body`
- `threadId`
- `replyToCommentId`
- `status`
- `createdAt`
- `updatedAt`

Notes:

- root draft comments have no `replyToCommentId`
- draft replies target a published thread or comment but remain private until submit
- `status` supports at least `active` and `stale`

### PullRequestSuggestion

One row per suggestion block linked to a draft comment and optionally to a published GitHub comment later.

Fields:

- `id`
- `workspaceId`
- `draftCommentId`
- `githubCommentId`
- `path`
- `startLine`
- `endLine`
- `originalCode`
- `suggestedCode`
- `originalFingerprint`
- `status`
- `applyDisabledReason`
- `appliedCommitSha`
- `appliedAt`
- `createdAt`
- `updatedAt`

Required persisted metadata for this feature:

- file path
- line range
- suggested code

The additional fingerprint and status fields allow safe revalidation and reliable UI state.

### PullRequestReviewerFileState

Per reviewer, PR, and file path.

Fields:

- `id`
- `userId`
- `owner`
- `repo`
- `pullNumber`
- `path`
- `fileFingerprint`
- `viewed`
- `lastViewedAt`

Constraints:

- unique on `userId + owner + repo + pullNumber + path`

Purpose:

- durable viewed state that can be reset automatically when the file patch materially changes

### PullRequestChecklistState

Per reviewer, PR, and generated checklist item key.

Fields:

- `id`
- `userId`
- `owner`
- `repo`
- `pullNumber`
- `itemKey`
- `itemFingerprint`
- `checked`
- `updatedAt`

Purpose:

- persists only reviewer completion state, not the generated checklist definition itself
- resets old completion state when the underlying evidence changes

## Backend Services And Mutations

The backend surface should stay narrow and composable.

### Read path

`getReviewWorkspace(prContext)`

Returns one normalized payload for the current reviewer that merges:

- GitHub PR data already fetched for the page
- workspace-level draft review state
- draft comments and suggestions
- checklist state
- viewed file state
- reviewer display preferences that belong to the PR review experience

The page should not scatter workspace reads across unrelated child components.

### Write paths

`upsertReviewWorkspaceDraft(...)`

- saves review-wide draft body or verdict
- stores display preferences that are meant to follow the reviewer

`upsertDraftComment(...)`

- creates or edits a staged inline comment or reply
- stores line fingerprint and head SHA snapshot
- parses and persists any suggestion payload in a linked suggestion row

`deleteDraftComment(...)`

- removes a staged comment and its linked suggestion rows

`setFileViewedState(...)`

- toggles one file viewed or unviewed
- supports bulk viewed updates for future convenience actions

`setChecklistItemState(...)`

- checks or unchecks one generated item for the current reviewer

`submitReviewWorkspace(...)`

- validates the workspace against the current diff
- creates or reuses a pending GitHub review
- uploads staged comments and replies into that pending review
- submits the review with `APPROVE`, `REQUEST_CHANGES`, or `COMMENT`
- clears successfully published private draft state

`applySuggestion(...)`

- validates permission to push to the PR head branch
- validates that the stored fingerprint still matches the target file content
- applies the patch to the PR branch
- stores apply metadata on the suggestion record
- revalidates the PR detail route and related caches

## Submission Flow

The submission path should be deliberate because GitHub review APIs are stricter than simple issue comments.

Normative flow:

1. Load the current reviewer workspace.
2. Fetch the latest PR head SHA and diff mapping.
3. Mark invalid draft comments or suggestions as `stale`.
4. If active draft comments exist, create a pending GitHub review.
5. Add each active staged comment or reply to that pending review.
6. Submit the pending review with the selected verdict and top-level body.
7. Revalidate the PR detail route and clear only the successfully published private draft state.

If any publish step fails, the workspace must remain intact so the reviewer does not lose work.

## Checklist Generation

Checklist generation should be deterministic and explainable. It should not depend on an AI model.

The rule engine should inspect changed file paths and patch metadata to derive checklist items and evidence.

### Rule categories

`tests`

- detect common test naming patterns such as `*.test.*`, `*.spec.*`
- detect test directories like `__tests__`
- detect app or package test files modified alongside product code

Generated item:

- `Are tests included or updated?`

`docs`

- detect markdown changes
- detect files under `docs/`
- detect README or public documentation updates

Generated item:

- `Are docs updated?`

`breaking changes`

- flag public API surface edits
- flag exported type or interface changes
- flag route contract changes, SDK surface changes, or schema contract changes

Generated item:

- `Does this introduce breaking changes?`

`config and environment`

- detect `.env*`
- detect CI and deployment config
- detect Prisma schema or migration changes
- detect workspace or app config changes

Generated item:

- `Are config or environment changes documented and safe?`

### Generated item shape

Each derived checklist item should include:

- `key`
- `label`
- `reason`
- `evidence`
- `fingerprint`

The UI uses `reason` and `evidence` to explain why the item exists. The persisted checklist state uses the `fingerprint` to know when prior completion is no longer trustworthy.

## UI Architecture

The current diff viewer has grown too broad. This work should extract responsibilities into smaller modules while preserving existing visual patterns where they still fit.

### PRReviewShell

Top-level coordinator for:

- current file and change focus
- merged published and draft review state
- review workspace mutations
- position indicator and global review shortcuts

### DiffViewport

Single rendering surface that can display:

- unified diff
- split diff

Both modes must read from the same normalized line model so that:

- syntax highlighting stays consistent
- inline comments map to stable line identities
- keyboard navigation works the same way in either view

### FileReviewHeader

Per-file header with:

- viewed toggle
- hide-viewed awareness
- unresolved thread count
- file status summary
- file position such as `File 3 of 12`

### ReviewThreadList And ReviewThreadCard

Shared thread UI for inline and sidebar contexts.

Supports:

- reply to comment
- collapse and expand
- resolve and unresolve
- resolved visual treatment
- clear draft-versus-published presentation

### DraftReviewPanel

Dedicated surface for:

- staged comment count
- top-level draft body
- selected verdict
- batch submission actions
- invalid or stale draft warnings

Submission actions must remain disabled until the draft review is valid enough to submit.

### ReviewChecklistSidebar

Sidebar module that renders:

- generated checklist items
- completion state
- evidence badges
- lightweight warnings when checklist items have stale fingerprints

### SuggestionBlock

Reusable suggestion renderer for inline comments and thread cards.

Must show:

- suggestion diff preview
- suggestion code block
- apply button
- permission or stale warnings
- applied state and applied commit metadata when available

## Interaction Model

### Inline comments and replies

- selecting lines opens a draft comment form
- submitting the form stages the comment privately in the workspace
- replies stage privately as draft replies until batch submit
- published comments and private draft comments render together, but draft comments are clearly labeled as private

### Review submission

- reviewers can stage multiple comments before publishing anything
- the final action remains one of `Approve`, `Request Changes`, or `Comment`
- draft mode prevents accidental early submission by separating `stage` from `submit`

### Suggestions

- suggestions can be created from selected line ranges
- multiple suggestions per PR are supported
- applying a suggestion is independent from review submission
- applied suggestions trigger PR diff refresh through server revalidation and client refresh

### Viewed files

- each file has a `Mark as viewed` toggle
- viewed state persists across sessions for the reviewer
- `Hide viewed files` filters the diff file list
- unresolved comments in viewed files must still remain reachable through navigation and sidebar entry points

### Split diff

- unified and split modes are toggles over the same data model
- inline comments must remain compatible in both modes
- user preference persists across sessions

### Navigation

Keyboard shortcuts:

- `j` moves to the next file or change target
- `k` moves to the previous file or change target
- optional follow-up support may jump to the next unresolved thread

The UI must maintain focus and announce the current file position for accessibility.

## Accessibility

- All toggles, review actions, and thread controls must be keyboard operable.
- Buttons and toggles need explicit accessible names, especially for viewed state and thread resolution.
- File position, unresolved counts, and draft state should be available to screen readers.
- Collapse and expand controls must expose state through `aria-expanded`.
- Keyboard shortcuts must not interfere with focused text inputs or editors.

## Error Handling And State Recovery

- If the PR head SHA changes, draft items are preserved but marked stale.
- If review submission partially fails, the workspace remains intact and the UI identifies which staged items were not published.
- If suggestion apply fails fingerprint validation, the suggestion stays visible with a retryable error state.
- If viewer preference or reviewer-local state persistence fails, optimistic UI rolls back and shows inline feedback instead of a blocking modal.
- If the reviewer lacks permission to push to the PR head branch, suggestion apply stays disabled with an explicit reason rather than failing after click.

## Testing Strategy

### Unit tests

- checklist rule engine output from changed files and patch metadata
- diff line identity mapping for unified and split modes
- suggestion patch generation and fingerprint validation
- viewed-file reset behavior when file fingerprints change

### Integration tests

- workspace load and save
- draft comment staging and deletion
- batch review submission
- suggestion apply flow
- checklist persistence
- viewed-file persistence and hide-viewed filtering

### Component tests

- split and unified rendering parity
- thread collapse and resolution behavior
- draft review panel validity rules
- keyboard navigation and focus handling

## Delivery Plan

This work should ship in phases even though the design is end-to-end.

### Phase 1. Review workspace backend

- Prisma schema additions and migration
- normalized review workspace types
- server actions for workspace read and write paths

### Phase 2. Diff shell refactor

- split `pr-diff-viewer` into review shell, viewport, thread, and suggestion modules
- preserve current behavior while reducing responsibility concentration

### Phase 3. Reviewer persistence features

- viewed files
- hide viewed
- checklist generation and persistence
- persisted review display preferences

### Phase 4. Draft review workflow

- stage comments and replies privately
- draft review panel
- batch review submission
- stale draft handling

### Phase 5. Suggestion hardening and navigation

- durable suggestion records
- permission-aware apply flow
- diff refresh after apply
- keyboard navigation polish

## Risks And Mitigations

- Risk: the hybrid model creates dual-state complexity.
  Mitigation: keep a strict boundary between GitHub published state and Repolith private workspace state.

- Risk: stale draft handling adds edge cases when head SHA changes frequently.
  Mitigation: preserve drafts, mark them stale explicitly, and require user action before publish.

- Risk: further edits inside the monolithic diff component become harder during transition.
  Mitigation: refactor around a review shell first so later features land in smaller focused modules.

- Risk: checklist heuristics may over-flag or under-flag breaking changes.
  Mitigation: keep the rules deterministic, explainable, and easy to extend, and treat checklist items as reviewer prompts rather than hard gates.

- Risk: applying suggestions against moving code can corrupt intent.
  Mitigation: store original fingerprints, validate before apply, and refuse unsafe apply attempts.

## Verification

Manual verification:

1. Open a PR and stage multiple inline comments without publishing them.
2. Refresh the page and confirm the draft review state restores for the same reviewer.
3. Switch devices or browsers under the same account and confirm the server-saved draft is restored.
4. Add a suggestion block, inspect its preview, and confirm the persisted suggestion survives refresh.
5. Apply a suggestion when the reviewer has push access and confirm the PR branch updates and the diff refreshes.
6. Open a PR where the reviewer lacks push access and confirm suggestion apply is disabled with a clear explanation.
7. Toggle split and unified diff and confirm inline comments and syntax highlighting remain aligned.
8. Mark several files viewed, reload, and confirm the viewed state persists.
9. Enable hide viewed and confirm viewed files are filtered without hiding the ability to reach unresolved work.
10. Submit a staged review and confirm the draft workspace clears after successful publication.
11. Update the PR branch while a draft exists and confirm affected draft items become stale instead of disappearing.

Automated verification:

- Add focused tests for the review workspace service layer, checklist rule engine, suggestion validation and apply flow, and diff rendering parity.
- Prefer small pure helpers for fingerprinting, checklist derivation, and diff line identity so tests do not depend on the full PR page.
