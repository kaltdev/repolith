# PR Review Responsive Design

Date: 2026-03-19
Status: Approved for planning

## Summary

The PR review experience added in the recent review-workspace work needs to be brought back into alignment with Repolith's authenticated responsive shell policy.

Today the PR detail route still behaves like a desktop split view above `lg` and a tab-swapped single-surface page below `lg`. That diverges from the responsive shell design approved in [`2026-03-15-authenticated-app-responsive-shell-design.md`](./2026-03-15-authenticated-app-responsive-shell-design.md), which requires the main technical surface to remain primary while secondary surfaces become drawers or sheets on narrower widths.

This design makes the PR diff the primary surface and treats `conversation`, `review`, and `overview` as mutually exclusive secondary surfaces. It converges the PR detail route onto the existing responsive surface model already used elsewhere in the app:

- `phone (0-639)`: diff-first with secondary content in bottom sheets
- `tablet (640-895)`: diff-first with secondary content in right sheets
- `wideTablet (896-1023)`: diff plus one persistent secondary pane when width allows
- `desktop (1024+)`: keep the current split layout and resizing model

The goal is to fix mobile and tablet usability without creating a second responsive architecture just for PR review.

## Goals

- Make the PR detail route usable on phone, tablet, and wide-tablet widths without sacrificing the diff as the primary surface.
- Align PR responsiveness with the authenticated shell policy and its viewport classes.
- Reuse the repo's existing responsive surface decision model instead of adding more PR-only `lg` conditionals.
- Preserve horizontal scrolling and readability for diff and code content.
- Keep conversation, review checklist, and AI overview accessible at every width.
- Preserve desktop split-pane behavior and desktop-only resize affordances.
- Keep state transitions predictable when the viewport crosses responsive mode boundaries.

## Non-Goals

- Redesigning the PR information architecture on desktop
- Replacing the diff viewer itself
- Changing PR review data models, suggestion behavior, or comment-thread semantics
- Refactoring unrelated authenticated-shell surfaces outside the PR route
- Removing horizontal overflow from technical content

## Current State

Relevant current files:

- [`apps/web/src/components/pr/pr-detail-layout.tsx`](../../../apps/web/src/components/pr/pr-detail-layout.tsx)
- [`apps/web/src/components/pr/pr-diff-viewer.tsx`](../../../apps/web/src/components/pr/pr-diff-viewer.tsx)
- [`apps/web/src/components/pr/review/pr-review-shell.tsx`](../../../apps/web/src/components/pr/review/pr-review-shell.tsx)
- [`apps/web/src/components/pr/review/review-checklist-sidebar.tsx`](../../../apps/web/src/components/pr/review/review-checklist-sidebar.tsx)
- [`apps/web/src/components/shared/responsive-surface-provider.tsx`](../../../apps/web/src/components/shared/responsive-surface-provider.tsx)
- [`apps/web/src/components/ui/sheet.tsx`](../../../apps/web/src/components/ui/sheet.tsx)
- [`apps/web/src/lib/responsive-surface-policy.ts`](../../../apps/web/src/lib/responsive-surface-policy.ts)

Observed issues:

- [`pr-detail-layout.tsx`](../../../apps/web/src/components/pr/pr-detail-layout.tsx) switches between `lg:hidden` mobile tabs and `lg:flex` desktop split panels, which collapses `tablet` and `wideTablet` into the same behavior even though the shell policy treats them differently.
- The mobile tab strip swaps the entire page away from the diff, which breaks the shell rule that main technical content should remain primary while secondary surfaces become sheets.
- [`pr-review-shell.tsx`](../../../apps/web/src/components/pr/review/pr-review-shell.tsx) hides its sidebar below `lg` instead of promoting it into a sheet or using a parent-resolved responsive mode.
- The recent review checklist sidebar works as a desktop side panel but does not yet have a route-level responsive host for tablet and phone presentation.
- The PR route already lives inside an app shell that has a shared responsive-surface policy, but the PR-specific layout is bypassing that model instead of participating in it.

## Context And Constraints

The design must follow the viewport policy from the authenticated responsive shell spec:

- `phone`: `0px` to `639px`
- `tablet`: `640px` to `895px`
- `wideTablet`: `896px` to `1023px`
- `desktop`: `1024px` and up

The repo already has a shared policy module that answers whether a surface should be persistent, a left sheet, a right sheet, or a bottom sheet. This PR responsiveness fix should extend or reuse that policy instead of introducing another independent set of breakpoints.

Context7 guidance for the existing Radix dialog primitives confirms that controlled `Dialog` and `Sheet` state is the correct model for responsive drawers: open state should be managed externally, focus should move into the sheet on open, and focus should return to the trigger on close. That matches the sheet primitive already wrapped in [`apps/web/src/components/ui/sheet.tsx`](../../../apps/web/src/components/ui/sheet.tsx).

## Core Decisions

### 1. The diff remains the primary surface at every non-desktop width

The PR page should not use tabs that replace the diff with conversation or review content on phone or tablet.

Instead:

- the diff remains mounted as the main reading surface
- secondary content opens over it as a sheet
- closing a sheet returns the user to the same diff context they were already reviewing

This matches the shell policy for technical content and keeps file navigation and inline review context stable.

### 2. `conversation`, `review`, and `overview` are modeled as mutually exclusive secondary surfaces

The PR route should have one route-local owner for secondary-surface state. That owner tracks the active surface and decides whether it is:

- persistent
- a right sheet
- a bottom sheet

The content components themselves should not each invent separate responsive open-state logic.

### 3. `wideTablet` may persist one secondary pane

For `896-1023px`, the PR route should allow a persistent secondary pane only when the shared responsive policy says the width budget is safe for the diff.

When persistence is allowed:

- the diff remains primary
- exactly one secondary surface may remain visible
- switching secondary surfaces replaces the pane content in place

When persistence is not allowed, the same active surface falls back to sheet presentation.

### 4. The last secondary surface is restored on `wideTablet`

On `wideTablet`, the default persistent pane should restore the last secondary surface the user used. If no prior state exists, it should fall back to `conversation`.

This state is a UI preference, not backend review data, so local browser persistence is sufficient.

### 5. Desktop keeps the existing split behavior

The current desktop split layout and resize affordances should remain intact. This change is about convergence with the shell policy for phone and tablet widths, not about redesigning the desktop PR experience.

## Layout Model

### Route-level behavior

The PR detail route becomes a thin adapter over the shared responsive-surface system.

It should resolve:

- the current viewport class
- which PR secondary surface is active
- whether that surface should be persistent or sheet-based
- whether the active secondary surface should be promoted or demoted during viewport changes

The route-level surface mapping is:

- primary surface: diff
- secondary surfaces: `conversation`, `review`, `overview`

### Viewport behavior

#### Phone

- Diff-first layout
- Secondary surfaces open as bottom sheets
- No persistent secondary panes
- Sheet triggers live in the diff-level action area instead of a page-replacing tab strip

#### Tablet

- Diff-first layout
- Secondary surfaces open as right sheets
- No persistent secondary panes
- Horizontal diff overflow remains intact

#### WideTablet

- Diff plus one persistent secondary pane when the shared width decision allows it
- Last-used secondary surface restores first
- If persistence is not allowed for the current width, the active secondary surface uses sheet mode instead

#### Desktop

- Existing desktop split layout remains the default
- Existing resize behavior remains desktop-only
- Secondary surface switching continues to happen inside the persistent right-side panel

## Components And State

### `PRDetailLayout`

[`apps/web/src/components/pr/pr-detail-layout.tsx`](../../../apps/web/src/components/pr/pr-detail-layout.tsx) should become the route-level coordinator instead of a breakpoint-specific tab shell.

Responsibilities:

- read viewport data from `ResponsiveSurfaceProvider`
- resolve the PR-specific secondary-surface mode
- store `activeSecondarySurface`
- persist and restore the last-used secondary surface for `wideTablet`
- render either a persistent pane host or a sheet host for the active secondary surface
- keep the existing desktop split ratio isolated to desktop behavior

### `PRSecondarySurfaceHost`

A small shared host component should encapsulate the behavior that is currently spread across desktop-only branches:

- common header and close affordances
- sheet versus persistent rendering
- consistent spacing and scroll ownership
- accessible title and description plumbing for sheet content

This host should render `conversation`, `review`, or `overview` content without those components needing to know whether they are inside a sheet or a pane.

### `PRDiffViewer`

[`apps/web/src/components/pr/pr-diff-viewer.tsx`](../../../apps/web/src/components/pr/pr-diff-viewer.tsx) remains the main technical surface.

On phone and tablet it should gain compact, touch-sized triggers for opening:

- conversation
- review
- overview

These triggers should show active state and counts where useful, but they should not replace the diff panel with tabs.

### `PRReviewShell`

[`apps/web/src/components/pr/review/pr-review-shell.tsx`](../../../apps/web/src/components/pr/review/pr-review-shell.tsx) should stop deciding visibility from `lg` classes alone.

Instead it should accept a resolved sidebar mode from the parent so the review/file sidebar can:

- remain persistent on desktop
- become a left sheet on smaller widths where appropriate
- preserve current diff-review behavior without hidden dead controls

### `ReviewChecklistSidebar`

[`apps/web/src/components/pr/review/review-checklist-sidebar.tsx`](../../../apps/web/src/components/pr/review/review-checklist-sidebar.tsx) should remain a content component. Its container assumptions need to be normalized so it works cleanly in:

- a desktop sidebar
- a `wideTablet` persistent pane
- a phone or tablet sheet

The checklist component should not own route-level responsive behavior.

## State And URL Behavior

- The selected secondary surface should remain deep-linkable through the existing `tab` query parameter.
- On phone and tablet, a `tab=review` or `tab=overview` deep link should open the corresponding sheet while preserving the diff as the primary page surface.
- On `wideTablet`, the same deep link should open or promote the corresponding persistent pane when width allows.
- Last-used secondary-surface preference should be stored locally per browser session or local storage.
- Desktop split ratio should remain independent of the secondary-surface preference.

## Interaction And Accessibility

- Use controlled Radix `Sheet` state for phone and tablet secondary surfaces.
- Provide sheet titles and descriptions so screen readers announce the currently opened PR secondary surface correctly.
- Preserve focus return to the triggering control on sheet close.
- Avoid nested drawer patterns on `wideTablet`; switching surfaces should replace pane content in place.
- Keep diff content horizontally scrollable and do not force wrapped code to accommodate a secondary surface.
- Make open and close affordances reachable from sticky headers or diff-level action bars with touch-appropriate targets.
- Preserve current file and scroll context when sheets open and close.

## Risks And Mitigations

- Risk: PR responsiveness could diverge again if the route adds new ad hoc breakpoint classes later.
  Mitigation: route-level responsive decisions should be centralized in one PR surface coordinator that builds on the shared responsive-surface policy.

- Risk: deep links could become confusing if `tab` means “replace page” in one viewport and “open sheet” in another.
  Mitigation: define `tab` as selecting the active secondary surface, not as selecting the whole page view.

- Risk: `wideTablet` persistence might crowd the diff on narrower devices.
  Mitigation: only persist the secondary pane when the shared policy says there is enough remaining width for the diff.

- Risk: focus handling could regress when promoting or demoting a surface across breakpoints.
  Mitigation: use controlled Radix sheet behavior and keep trigger ownership in the route-level coordinator.

## Verification

Manual verification:

1. Test the PR detail route at `390px` and confirm the diff remains primary while conversation, review, and overview open as bottom sheets.
2. Test at `768px` and `834px` and confirm the diff remains primary while secondary surfaces open as right sheets.
3. Test at `912px` and confirm the route restores the last-used secondary surface as a persistent pane when width allows.
4. Cross the `895px` and `1024px` boundaries and confirm the active secondary surface is preserved while presentation promotes or demotes correctly.
5. Confirm the review checklist remains usable in sheet and persistent-pane presentations.
6. Confirm horizontal diff scrolling still works on phone and tablet widths.
7. Confirm desktop split resizing still works at `1024px` and above.

Automated verification:

- Add focused tests for the PR secondary-surface decision logic, including viewport mapping and persistence fallback.
- Add a regression test for last-used secondary-surface restoration on `wideTablet`.
- Prefer testing pure decision helpers rather than brittle viewport-heavy component snapshots.
- Existing responsive-surface-policy tests should remain authoritative for the shared viewport classes and generic surface modes.
