# PR Review Experience Implementation Plan

Date: 2026-03-18
Status: Ready for implementation
Spec: [../specs/2026-03-18-pr-review-experience-design.md](../specs/2026-03-18-pr-review-experience-design.md)

## Summary

This plan implements the approved hybrid PR review design in five phases:

1. review workspace backend and schema
2. diff shell refactor
3. reviewer persistence features
4. draft review workflow
5. suggestion hardening and navigation polish

The sequence is intentionally backend-first. Draft reviews, checklist persistence, and viewed-file state all depend on a durable reviewer workspace before the UI can be safely upgraded.

## Implementation Principles

- Keep GitHub as the source of truth for published comments, threads, reviews, and branch commits.
- Store reviewer-private state in Repolith only.
- Minimize new responsibilities inside [`apps/web/src/components/pr/pr-diff-viewer.tsx`](../../../apps/web/src/components/pr/pr-diff-viewer.tsx) by extracting modules before feature growth continues.
- Prefer pure helpers for diff identity, checklist derivation, and fingerprint validation so the behavior is testable without the full PR page.
- Preserve existing UX where it already works; improve the review experience without imposing a redesign tax.

## Proposed File Layout

New backend modules:

- `apps/web/src/lib/pr-review-workspace.ts`
- `apps/web/src/lib/pr-review-fingerprints.ts`
- `apps/web/src/lib/pr-review-checklist.ts`
- `apps/web/src/lib/pr-review-types.ts`
- `apps/web/src/app/(app)/repos/[owner]/[repo]/pulls/review-workspace-actions.ts`

New UI modules:

- `apps/web/src/components/pr/review/pr-review-shell.tsx`
- `apps/web/src/components/pr/review/diff-viewport.tsx`
- `apps/web/src/components/pr/review/file-review-header.tsx`
- `apps/web/src/components/pr/review/review-thread-list.tsx`
- `apps/web/src/components/pr/review/review-thread-card.tsx`
- `apps/web/src/components/pr/review/draft-review-panel.tsx`
- `apps/web/src/components/pr/review/review-checklist-sidebar.tsx`
- `apps/web/src/components/pr/review/suggestion-block.tsx`

Primary existing files to update:

- [`apps/web/prisma/schema.prisma`](../../../apps/web/prisma/schema.prisma)
- [`apps/web/src/app/(app)/repos/[owner]/[repo]/pulls/[number]/page.tsx`](../../../apps/web/src/app/(app)/repos/[owner]/[repo]/pulls/[number]/page.tsx)
- [`apps/web/src/app/(app)/repos/[owner]/[repo]/pulls/pr-actions.ts`](../../../apps/web/src/app/(app)/repos/[owner]/[repo]/pulls/pr-actions.ts)
- [`apps/web/src/components/pr/pr-diff-viewer.tsx`](../../../apps/web/src/components/pr/pr-diff-viewer.tsx)
- [`apps/web/src/components/pr/pr-review-form.tsx`](../../../apps/web/src/components/pr/pr-review-form.tsx)
- [`apps/web/src/components/pr/pr-reviews-panel.tsx`](../../../apps/web/src/components/pr/pr-reviews-panel.tsx)
- [`apps/web/src/lib/diff-preferences.ts`](../../../apps/web/src/lib/diff-preferences.ts)
- [`apps/web/src/lib/mutation-events.ts`](../../../apps/web/src/lib/mutation-events.ts)

## Phase 1: Review Workspace Backend

### Goals

- add durable reviewer-private schema
- create typed read and write services
- keep the page’s GitHub data flow intact while overlaying reviewer workspace state

### Tasks

1. Add Prisma models for:
   - `PullRequestReviewWorkspace`
   - `PullRequestDraftComment`
   - `PullRequestSuggestion`
   - `PullRequestReviewerFileState`
   - `PullRequestChecklistState`
2. Generate and apply a Prisma migration.
3. Add a typed service module that:
   - loads a reviewer workspace by `userId + owner + repo + pullNumber`
   - upserts workspace state
   - upserts and deletes draft comments
   - upserts suggestions
   - stores viewed-file state
   - stores checklist state
4. Add fingerprint helper utilities for:
   - file patch fingerprints
   - line range fingerprints
   - suggestion apply validation
5. Add checklist rule utilities that derive items from changed files and patch metadata.
6. Add a page-level loader that normalizes:
   - GitHub PR data
   - workspace overlay data
   - generated checklist items with reviewer completion state

### Deliverables

- Prisma schema update and migration
- new service modules for review workspace access
- unit tests for checklist derivation and fingerprinting

### Validation

- `bunx prisma generate`
- targeted tests for new pure helpers
- typecheck on new workspace types and service functions

## Phase 2: Diff Shell Refactor

### Goals

- reduce the responsibility concentration in the diff viewer
- establish stable component boundaries before adding more workflow features

### Tasks

1. Extract a `PRReviewShell` container from the existing diff viewer.
2. Move diff rendering into `DiffViewport` with a normalized line model shared by unified and split views.
3. Extract `FileReviewHeader` for per-file controls and indicators.
4. Extract `SuggestionBlock` from the existing inline comment rendering path.
5. Extract thread rendering into `ReviewThreadList` and `ReviewThreadCard`.
6. Keep existing behavior working while the extracted modules are still backed by the old immediate-publish comment model.

### Deliverables

- smaller review-oriented component tree
- one normalized diff model used in both unified and split modes
- stable composition points for later phases

### Validation

- manual parity pass between pre-refactor and post-refactor diff rendering
- targeted component tests for unified and split rendering parity
- no regression in existing suggestion rendering or thread resolution behavior

## Phase 3: Reviewer Persistence Features

### Goals

- move reviewer progress state out of browser-local only storage
- ship viewed files, hide viewed, checklist sidebar, and persistent review display preferences

### Tasks

1. Replace UI-local viewed file state with server-backed reviewer file state.
2. Persist `hide viewed files` in the review workspace.
3. Move split and unified preference persistence into reviewer workspace state while continuing to interoperate with local storage during migration.
4. Add `ReviewChecklistSidebar` to the PR detail layout.
5. Render deterministic checklist items with evidence and reviewer completion state.
6. Reset viewed and checklist state when fingerprints become stale.
7. Add optimistic updates for:
   - viewed toggle
   - hide viewed toggle
   - checklist check and uncheck

### Deliverables

- durable per-reviewer viewed state
- hide-viewed filtering
- dynamic checklist sidebar with persisted completion state
- restored diff mode preference across sessions

### Validation

- reload and cross-session persistence checks
- integration tests for file viewed and checklist state updates
- keyboard and screen reader audit for new toggles

## Phase 4: Draft Review Workflow

### Goals

- convert inline review authoring from immediate publish to private staging
- support batch submission as a real draft review workflow

### Tasks

1. Introduce draft comment and reply forms that write to the review workspace instead of calling GitHub immediately.
2. Add draft comment rendering inline in the diff and in thread views.
3. Add `DraftReviewPanel` showing:
   - staged comment count
   - draft body
   - selected verdict
   - stale draft warnings
4. Implement `submitReviewWorkspace(...)`:
   - validate current head SHA and fingerprints
   - create a pending GitHub review when needed
   - upload staged comments and replies
   - submit final verdict and body
   - clear successfully published draft state
5. Prevent premature submission by disabling final actions when:
   - the draft contains stale items
   - required fields for the selected verdict are missing
6. Preserve partially failed review submissions so work is recoverable.

### Deliverables

- private server-saved draft reviews
- batch review submission
- stale draft handling

### Validation

- integration tests for staging, reloading, and submitting reviews
- failure-mode tests for partial submission and stale draft detection
- manual QA across `Comment`, `Approve`, and `Request Changes`

## Phase 5: Suggestion Hardening And Navigation

### Goals

- make suggestions first-class persisted records
- harden apply flow
- finish review navigation and keyboard ergonomics

### Tasks

1. Persist explicit suggestion rows when draft comments contain suggestion blocks.
2. Replace markdown-only suggestion handling with `SuggestionBlock` backed by suggestion metadata.
3. Implement `applySuggestion(...)` against persisted suggestion records:
   - validate branch permission
   - validate target fingerprint
   - patch file content
   - commit to PR head branch
   - store `appliedCommitSha` and `appliedAt`
4. Mark suggestion apply disabled when the reviewer cannot push to the PR head branch.
5. Refresh the PR diff immediately after successful suggestion apply using server invalidation plus client refresh.
6. Add keyboard navigation improvements:
   - `j` next file or change target
   - `k` previous file or change target
   - optional unresolved-thread jump if the line model supports it cleanly
7. Add visible position indicators and focus management for navigation.

### Deliverables

- durable suggestion storage
- permission-aware apply suggestion flow
- diff refresh after suggestion apply
- keyboard navigation polish and file position UI

### Validation

- integration tests for suggestion apply success and permission-disabled cases
- component tests for suggestion rendering and state transitions
- manual keyboard navigation QA in unified and split modes

## Cross-Cutting Test Plan

### Unit tests

- `pr-review-checklist` rule engine
- `pr-review-fingerprints` helpers
- diff line identity helpers
- suggestion patch generation

### Integration tests

- workspace save and load
- viewed file state persistence
- checklist state persistence
- draft review submission
- suggestion apply flow

### Component tests

- split and unified parity
- draft versus published thread rendering
- checklist sidebar interaction
- file header viewed controls
- keyboard navigation and focus behavior

## Rollout Order

Recommended merge order:

1. schema and backend helpers
2. diff shell extraction with no behavior change
3. viewed files and checklist persistence
4. draft review staging and submission
5. suggestion apply hardening and navigation polish

This order keeps each PR review upgrade reviewable and reduces the risk of shipping a large untestable branch.

## Risks And Mitigations

- Risk: the initial diff shell extraction becomes a long-lived refactor branch.
  Mitigation: keep Phase 2 behavior-preserving and land it before feature-heavy changes.

- Risk: draft review submission may not map cleanly onto the exact GitHub review API constraints.
  Mitigation: isolate the GitHub submission adapter behind `submitReviewWorkspace(...)` and test it against the currently used Octokit flows.

- Risk: server-backed preferences could conflict with existing local storage values.
  Mitigation: define a one-time precedence rule that uses workspace state when available and falls back to local state otherwise.

- Risk: fingerprint invalidation becomes too aggressive.
  Mitigation: start with conservative invalidation rules and expose stale state visibly instead of silently dropping drafts.

## Definition Of Done

The implementation is complete when all of the following are true:

- reviewers can stage multiple inline comments and replies privately, reload, and still see them
- reviewers can submit staged feedback as one review with `Approve`, `Request Changes`, or `Comment`
- suggestion blocks persist explicit backend metadata and can be applied in one click when permission allows
- the diff view supports reliable unified and split rendering with shared comment compatibility
- files can be marked viewed per reviewer and hidden across sessions
- the checklist sidebar is generated from the diff, explainable, and persists completion state per reviewer
- resolved and unresolved thread states remain functional
- keyboard navigation works without interfering with text entry
- targeted automated tests cover the new backend helpers and key review workflows
