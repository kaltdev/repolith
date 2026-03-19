# PR Review Responsive Implementation Plan

Date: 2026-03-19
Status: Ready for implementation
Spec: [../specs/2026-03-19-pr-review-responsive-design.md](../specs/2026-03-19-pr-review-responsive-design.md)

## Summary

This plan implements the approved PR detail responsive design in four phases:

1. route-level responsive surface decisions
2. secondary surface host and diff-first mobile and tablet controls
3. review-shell and checklist normalization
4. responsive polish and verification

The sequence is intentionally layout-controller first. The current PR page has responsive behavior spread across `lg`-only branches, so the first step is to centralize the surface decision model before changing individual panels.

## Implementation Principles

- Reuse the shared authenticated-shell viewport policy and `ResponsiveSurfaceProvider`.
- Keep the diff mounted as the main technical surface on phone and tablet.
- Treat `conversation`, `review`, and `overview` as one mutually exclusive secondary-surface slot.
- Preserve current desktop split behavior unless a change is required to support the shared responsive model.
- Keep responsive mode decisions in pure helpers where possible so they are testable without a browser-heavy harness.

## Proposed File Layout

New modules:

- `apps/web/src/components/pr/review/pr-secondary-surface-host.tsx`
- `apps/web/src/lib/pr-detail-responsive.ts`

Primary existing files to update:

- [`apps/web/src/components/pr/pr-detail-layout.tsx`](../../../apps/web/src/components/pr/pr-detail-layout.tsx)
- [`apps/web/src/components/pr/pr-diff-viewer.tsx`](../../../apps/web/src/components/pr/pr-diff-viewer.tsx)
- [`apps/web/src/components/pr/review/pr-review-shell.tsx`](../../../apps/web/src/components/pr/review/pr-review-shell.tsx)
- [`apps/web/src/components/pr/review/review-checklist-sidebar.tsx`](../../../apps/web/src/components/pr/review/review-checklist-sidebar.tsx)
- [`apps/web/src/app/(app)/repos/[owner]/[repo]/pulls/[number]/page.tsx`](../../../apps/web/src/app/(app)/repos/[owner]/[repo]/pulls/[number]/page.tsx) if prop wiring changes are needed

New or updated tests:

- `apps/web/src/lib/pr-detail-responsive.test.ts`
- targeted component tests near the PR review components if the existing test harness supports them cleanly

## Phase 1: Route-Level Responsive Surface Decisions

### Goals

- remove PR-detail-specific `lg` layout branching as the source of truth
- centralize viewport-to-surface behavior for `conversation`, `review`, and `overview`
- preserve desktop split behavior while making phone, tablet, and wide-tablet behavior deterministic

### Tasks

1. Add a small pure helper in `apps/web/src/lib/pr-detail-responsive.ts` that:
   - reads the shared viewport classes
   - resolves whether the active PR secondary surface is `persistent`, `rightSheet`, or `bottomSheet`
   - answers whether `wideTablet` may persist a secondary pane for the current width
2. Keep the helper layered on the shared responsive primitives instead of embedding new breakpoints inside the PR components.
3. Update [`pr-detail-layout.tsx`](../../../apps/web/src/components/pr/pr-detail-layout.tsx) to:
   - use `useResponsiveSurfaceContext()`
   - replace the current `mobileTab`-driven page swap model
   - track `activeSecondarySurface`
   - track whether the secondary surface is open in sheet mode
4. Preserve and normalize the existing `tab` query param so it selects the active secondary surface across all viewport classes.
5. Add local persistence for the last-used secondary surface with:
   - restore on `wideTablet`
   - fallback to `conversation` when no prior value exists
   - no coupling to backend review workspace state

### Deliverables

- one PR-specific responsive decision helper
- one route-level owner for active PR secondary-surface state
- deterministic mode switching between phone, tablet, wide-tablet, and desktop

### Validation

- unit tests for viewport-to-mode decisions
- unit tests for last-used-surface fallback behavior
- manual checks that query-param deep links still open the intended secondary surface

## Phase 2: Secondary Surface Host And Diff-First Controls

### Goals

- keep the diff primary on phone and tablet
- move secondary content into one reusable host for sheets and persistent panes
- remove the current bottom tab strip behavior

### Tasks

1. Add `PRSecondarySurfaceHost` to encapsulate:
   - sheet versus persistent rendering
   - common header treatment
   - close affordances
   - accessible titles and descriptions
   - consistent scroll ownership
2. Refactor [`pr-detail-layout.tsx`](../../../apps/web/src/components/pr/pr-detail-layout.tsx) to render:
   - diff as the always-present primary surface on phone and tablet
   - one active secondary surface through `PRSecondarySurfaceHost`
   - the current desktop split panel through the same active-surface state
3. Remove the current mobile tab strip that swaps the whole page between `Files`, `Chat`, and `Review`.
4. Update [`pr-diff-viewer.tsx`](../../../apps/web/src/components/pr/pr-diff-viewer.tsx) to expose compact triggers for:
   - conversation
   - review
   - overview
5. Ensure those triggers:
   - work for touch
   - expose active state and counts where available
   - restore focus correctly when a sheet closes

### Deliverables

- shared PR secondary-surface host
- diff-first phone and tablet flow
- removal of page-replacing mobile tabs

### Validation

- manual verification at `390px`, `768px`, and `834px`
- accessibility check for sheet focus entry and focus return
- confirm diff horizontal overflow still behaves correctly with sheets open and closed

## Phase 3: Review Shell And Checklist Normalization

### Goals

- make the review-specific shells cooperate with the new parent surface mode
- ensure checklist and review panes work in persistent and sheet contexts

### Tasks

1. Update [`pr-review-shell.tsx`](../../../apps/web/src/components/pr/review/pr-review-shell.tsx) so sidebar visibility is driven by parent-resolved mode rather than `hidden lg:flex`.
2. Allow the review/file sidebar to:
   - remain persistent on desktop
   - become sheet-backed on smaller widths when needed
   - avoid dead controls or inaccessible hidden content
3. Normalize [`review-checklist-sidebar.tsx`](../../../apps/web/src/components/pr/review/review-checklist-sidebar.tsx) spacing and height assumptions so it can render cleanly inside:
   - desktop sidebars
   - wide-tablet persistent panes
   - phone and tablet sheets
4. Verify `conversation`, `review`, and `overview` content do not each keep conflicting local responsive state once hosted by the shared secondary-surface container.
5. Keep existing review-workspace persistence behavior unchanged while moving only presentation responsibilities.

### Deliverables

- responsive-aware review shell
- checklist content that works in both pane and sheet presentations
- PR secondary content with cleaner parent-child boundaries

### Validation

- manual review of checklist and review form usability in sheet and pane modes
- targeted tests for any extracted pure layout helpers
- no regression in the existing review-workspace interactions

## Phase 4: Responsive Polish And Verification

### Goals

- preserve user context across viewport changes
- tighten touch, keyboard, and visual behavior at the approved breakpoints
- finish with explicit regression coverage

### Tasks

1. Preserve the active secondary surface when crossing:
   - `tablet` to `wideTablet`
   - `wideTablet` to `desktop`
   - reverse transitions back to sheet mode
2. Ensure promotion and demotion between persistent pane and sheet do not lose the user’s current diff context.
3. Polish action placement and sticky header behavior so surface triggers stay reachable on smaller screens.
4. Confirm counts, viewed indicators, and review checklist entry points remain visible and understandable outside desktop.
5. Add or update tests covering:
   - responsive decision logic
   - last-used-surface restore
   - query-param selection behavior
6. Run typecheck, lint, and focused tests, then do a manual breakpoint pass at:
   - `390px`
   - `768px`
   - `834px`
   - `912px`
   - `1024px+`

### Deliverables

- polished breakpoint transitions
- responsive regression coverage for the PR detail route
- validated mobile, tablet, wide-tablet, and desktop behavior

### Validation

- `bunx tsc --noEmit -p apps/web/tsconfig.json`
- `bun run lint`
- focused test command for new helpers and PR responsive regressions
- manual breakpoint QA using the widths listed above

## Cross-Cutting Risks

- Risk: responsive state could become split between the PR route and review subcomponents.
  Mitigation: keep `PRDetailLayout` as the single owner of active secondary-surface mode and open state.

- Risk: wide-tablet persistence could be implemented as another special `lg` branch.
  Mitigation: route logic should derive behavior from the shared viewport classes and pure helper output, not inline breakpoint checks.

- Risk: removing the mobile tab strip could accidentally hide review entry points.
  Mitigation: add explicit diff-level secondary-surface triggers before deleting the tab-swapped flow.

- Risk: responsive fixes could regress desktop resizing.
  Mitigation: keep the current desktop split code path intact and isolate resize logic to desktop-only behavior.
