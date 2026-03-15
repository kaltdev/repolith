# Authenticated App Responsive Shell Design

Date: 2026-03-15
Status: Approved for planning

## Summary

Repolith will make the authenticated `/(app)` experience fully responsive across phone, tablet, desktop, and large-monitor widths without rebuilding the application shell from scratch.

The responsive pass will keep the main content area dominant, preserve technical content layouts such as code and diffs, and convert secondary surfaces into drawers or sheets when persistent panels would compromise readability.

The design introduces a centralized responsive surface-policy model that decides when a surface is:

- persistent
- a left drawer
- a right drawer
- a bottom sheet

This replaces the current mix of one-off `lg` layout switches and `useIsMobile(<768)` checks.

## Goals

- Make the authenticated shell under `/(app)` responsive from `320px` through large desktop widths.
- Keep the primary content area readable and dominant at every size.
- Keep all secondary surfaces accessible on phone and tablet.
- Convert repo sidebars, file explorer panels, document outline, and Ghost chat into drawers or sheets where needed.
- Allow only one major persistent secondary surface in the upper tablet range when width supports it.
- Preserve horizontal scrolling for technical content such as code, diffs, and file trees.
- Reflow ordinary data surfaces such as cards, metadata groups, and general tables into mobile-friendly stacked layouts where practical.
- Reuse the existing Tailwind, Radix `Dialog`, and Radix `Sheet` primitives already used in the codebase.

## Non-Goals

- Changing the public landing page at `/`
- Replacing the fixed navbar with a different navigation architecture
- Introducing a generalized multi-panel workspace system
- Redesigning desktop information architecture or route structure
- Refactoring unrelated feature logic while touching responsive surfaces
- Removing horizontal scrolling from technical content

## Current State

The authenticated shell already has good component-level responsive instincts, but the overall behavior is inconsistent.

Relevant current files include:

- [`apps/web/src/app/(app)/layout.tsx`](../../../apps/web/src/app/(app)/layout.tsx)
- [`apps/web/src/components/layout/navbar.tsx`](../../../apps/web/src/components/layout/navbar.tsx)
- [`apps/web/src/components/layout/nav-aware-content.tsx`](../../../apps/web/src/components/layout/nav-aware-content.tsx)
- [`apps/web/src/components/dashboard/dashboard-content.tsx`](../../../apps/web/src/components/dashboard/dashboard-content.tsx)
- [`apps/web/src/components/repo/repo-layout-wrapper.tsx`](../../../apps/web/src/components/repo/repo-layout-wrapper.tsx)
- [`apps/web/src/components/repo/code-content-wrapper.tsx`](../../../apps/web/src/components/repo/code-content-wrapper.tsx)
- [`apps/web/src/components/repo/document-outline.tsx`](../../../apps/web/src/components/repo/document-outline.tsx)
- [`apps/web/src/components/shared/global-chat-panel.tsx`](../../../apps/web/src/components/shared/global-chat-panel.tsx)
- [`apps/web/src/components/issue/issue-detail-layout.tsx`](../../../apps/web/src/components/issue/issue-detail-layout.tsx)
- [`apps/web/src/components/pr/pr-detail-layout.tsx`](../../../apps/web/src/components/pr/pr-detail-layout.tsx)
- [`apps/web/src/components/repo/commits-list.tsx`](../../../apps/web/src/components/repo/commits-list.tsx)
- [`apps/web/src/components/pr/prs-list.tsx`](../../../apps/web/src/components/pr/prs-list.tsx)
- [`apps/web/src/components/ui/dialog.tsx`](../../../apps/web/src/components/ui/dialog.tsx)
- [`apps/web/src/components/ui/sheet.tsx`](../../../apps/web/src/components/ui/sheet.tsx)

Observed issues:

- Breakpoint policy is inconsistent.
  - [`apps/web/src/hooks/use-is-mobile.ts`](../../../apps/web/src/hooks/use-is-mobile.ts) treats mobile as `<768px`.
  - Major layout changes often happen at `lg` (`1024px`).
- Major repo surfaces disappear below `lg` instead of remaining available through alternate navigation.
- Some detail and list surfaces still use fixed or overly large side-panel widths for narrow screens.
- Scroll ownership varies by route and breakpoint in ways that make some pages harder to reason about.

The codebase uses:

- Next.js `16.1.6` App Router
- React `19.2.4`
- Tailwind CSS `4`
- Radix dialog primitives wrapped in local `Dialog` and `Sheet` components

Context7 guidance confirms the existing architecture is compatible with this direction:

- Next.js nested layouts are the correct place to preserve the authenticated shell while varying page content.
- Radix dialog primitives already support the modal drawer and overlay behavior needed for responsive secondary surfaces.
- Tailwind remains the correct styling system for a mobile-first responsive pass.

## Core Decisions

### 1. The responsive model is centralized

Responsive behavior will be driven by one shared policy module instead of each component inferring mobile state independently.

That module will answer:

- which viewport class is active
- whether one major secondary surface may persist
- which presentation mode a named surface should use

### 2. The app remains mobile-first

Base layouts should work as single-surface flows first. Persistent side panels are enhancements added only when width safely allows them.

This avoids hydration-sensitive desktop assumptions and keeps narrow screens functional by default.

### 3. The main content area always wins

At every breakpoint, the primary reading or editing surface keeps priority over side surfaces.

If a persistent side panel would materially reduce readability, that panel becomes a drawer or sheet instead.

### 4. Only one major persistent secondary surface is allowed in hybrid tablet mode

In upper tablet widths, the app may keep one major secondary surface visible, preferably the repo/file sidebar in repo browsing flows.

Tertiary surfaces such as document outline and Ghost chat remain toggleable even in hybrid tablet mode.

### 5. Technical content keeps structural overflow

Code views, diffs, and file trees remain horizontally scrollable on narrow screens.

This pass will not compress technical layouts into unreadable wrapped forms solely to remove overflow.

### 6. General data surfaces should reflow

Metadata grids, standard tables, card collections, and auxiliary info panels should stack or simplify on smaller screens when doing so improves readability without hiding essential actions.

## Viewport Policy

The policy module defines four viewport classes:

- `phone`: `0px` to `639px`
- `tablet`: `640px` to `895px`
- `wideTablet`: `896px` to `1023px`
- `desktop`: `1024px` and up

These are policy thresholds, not a mandate to replace Tailwind’s built-in `sm`, `md`, or `lg` utilities everywhere.

CSS should continue to use standard Tailwind breakpoints where practical. The policy layer exists to decide surface behavior, not to replace Tailwind.

## Surface Policy Model

### Policy API

Implementation planning should center on a pure function plus a client hook.

Recommended shape:

```ts
type ResponsiveViewport = "phone" | "tablet" | "wideTablet" | "desktop";

type RouteKind =
	| "dashboard"
	| "repoOverview"
	| "repoCode"
	| "repoDocument"
	| "issueDetail"
	| "prDetail"
	| "listWithPeek"
	| "modalOnly";

type SurfaceId =
	| "repoSidebar"
	| "fileExplorer"
	| "documentOutline"
	| "ghostChat"
	| "detailPeek"
	| "metadataSidebar";

type SurfaceMode = "persistent" | "leftSheet" | "rightSheet" | "bottomSheet";

type ResponsiveSurfaceContext = {
	viewportWidth: number;
	routeKind: RouteKind;
	surfaceId: SurfaceId;
	requestedSurfaceWidth: number;
	mainContentMinWidth: number;
	anotherMajorSurfaceIsPersistent: boolean;
};
```

The pure function decides:

- `viewport`
- whether one major surface may persist
- the mode for the requested surface
- whether the surface must be downgraded to sheet mode

The hook reads window size and exposes that policy to client components.

Ownership:

- the shared hook owns viewport classification
- route wrappers provide `routeKind`
- each surface owner provides its preferred width and the minimum readable width required by the main content
- the policy function returns the final mode

### Persistent-surface eligibility

Only these surfaces are eligible to claim the one persistent major-secondary slot below desktop:

- `fileExplorer`
- `repoSidebar`

All of the following remain sheet-based below desktop:

- `documentOutline`
- `ghostChat`
- `detailPeek`
- `metadataSidebar`

Priority order in `wideTablet`:

1. `fileExplorer`
2. `repoSidebar`

If `fileExplorer` is active on a repo code or document route, it wins the persistent slot and `repoSidebar` must remain toggleable.

### Readable-width downgrade rule

A surface may persist only when:

- the viewport class allows persistence
- no higher-priority surface already owns the persistent slot
- the remaining main-content width stays above the route minimum

Route minimums:

- `repoCode`, `repoDocument`, `prDetail`: `640px`
- `repoOverview`, `issueDetail`, `dashboard`, `listWithPeek`: `560px`

Evaluation rule:

- if `viewportWidth - requestedSurfaceWidth - shellGutters` is below the route minimum, the surface downgrades to sheet mode

For planning purposes, `shellGutters` should be treated as the fixed horizontal chrome and content padding required by the current shell, not as an optional visual nicety.

### SSR and hydration behavior

The server-rendered layout should assume the mobile-first, non-persistent baseline.

After hydration, the client hook may promote specific surfaces to `persistent` when the viewport supports it.

This keeps the initial HTML safe and avoids a server-rendered desktop panel flashing on narrow screens.

### Runtime resize and route-transition behavior

Surface mode changes must be stable during live resize, tablet rotation, and route transitions.

Rules:

- If a persistent surface becomes ineligible after resize or rotation, it should remain open but convert into its sheet variant.
- If a sheet-based surface becomes eligible for persistence after resize, it may promote into the persistent slot without losing its visible state.
- If navigation leaves the route family that owns a local surface, that local surface closes.
- Global Ghost chat may remain open across route transitions, but it must still obey the viewport-specific mode after navigation.
- Entering a route that activates a higher-priority persistent candidate must evict a lower-priority candidate back to sheet mode.
- Only one major persistent surface may exist at a time in `wideTablet`.

## Shell Behavior

### Authenticated app layout

[`apps/web/src/app/(app)/layout.tsx`](../../../apps/web/src/app/(app)/layout.tsx) remains the authenticated shell.

The shell keeps:

- the fixed navbar
- the global providers
- the nested page layout model

The shell changes:

- `NavAwareContent` should be simplified into a predictable page-frame wrapper with consistent `min-h-0`, overflow rules, and navbar offset behavior.
- Pages should have a clear primary scroll container instead of mixing multiple implicit scroll owners.
- Secondary-surface toggles should be exposed near the content header or toolbar rather than relying on hidden desktop affordances.

### Scroll ownership

Each major page should have one primary scroll owner for its main content region.

Rules:

- The fixed navbar stays outside the page scroll region.
- Main content containers should use `min-h-0` consistently so sheets and internal scroll regions behave correctly.
- When a Radix sheet or dialog is open, the underlying page becomes inert through the primitive rather than through custom scroll hacks.
- Technical content regions may still own horizontal overflow inside the main vertical scroll container.

## Route And Component Behavior

### Dashboard and general app pages

[`apps/web/src/components/dashboard/dashboard-content.tsx`](../../../apps/web/src/components/dashboard/dashboard-content.tsx) should remain a stacked mobile-first layout that expands to split columns only when enough width exists.

Rules:

- Phone and tablet widths use a single-column reading order.
- Desktop and large monitors may retain the current two-column structure.
- Cards and summary panels should use adaptive spacing and avoid side-by-side density that forces truncation on small screens.

### Repo metadata sidebar

Relevant files:

- [`apps/web/src/components/repo/repo-layout-wrapper.tsx`](../../../apps/web/src/components/repo/repo-layout-wrapper.tsx)
- [`apps/web/src/components/repo/repo-sidebar.tsx`](../../../apps/web/src/components/repo/repo-sidebar.tsx)

Rules:

- `phone`: repo sidebar is a drawer or bottom-aligned sheet triggered from the page header or toolbar.
- `tablet`: repo sidebar remains toggleable, not persistent.
- `wideTablet`: repo sidebar may become the one persistent major secondary surface on repo overview-style pages when no higher-priority persistent repo surface is active.
- `desktop`: current persistent sidebar behavior remains acceptable, with width cleanup where necessary.

If a repo code page already uses the file explorer as the one persistent secondary surface, the repo metadata sidebar must stay toggleable instead of becoming a second persistent panel.

### File explorer

Relevant files:

- [`apps/web/src/components/repo/code-content-wrapper.tsx`](../../../apps/web/src/components/repo/code-content-wrapper.tsx)
- [`apps/web/src/components/repo/file-explorer-tree.tsx`](../../../apps/web/src/components/repo/file-explorer-tree.tsx)

Rules:

- `phone`: file explorer opens as a left drawer.
- `tablet`: file explorer remains a left drawer.
- `wideTablet`: file explorer becomes the preferred persistent secondary surface for code browsing.
- `desktop`: persistent file explorer remains allowed with existing resize affordances.

The main code or document view stays primary. If keeping the explorer visible would squeeze code below a readable width, the explorer falls back to drawer mode even in `wideTablet`.

### Document outline

Relevant file:

- [`apps/web/src/components/repo/document-outline.tsx`](../../../apps/web/src/components/repo/document-outline.tsx)

Rules:

- `phone`: open as a bottom sheet
- `tablet`: open as a right drawer
- `wideTablet`: open as a right drawer
- `desktop`: may remain as currently designed where already useful

The outline is never the one persistent major secondary surface in hybrid tablet mode.

### Ghost chat

Relevant file:

- [`apps/web/src/components/shared/global-chat-panel.tsx`](../../../apps/web/src/components/shared/global-chat-panel.tsx)

Rules:

- `phone`: bottom sheet
- `tablet`: right drawer
- `wideTablet`: right drawer
- `desktop`: toggleable slide-over panel

Ghost chat should remain accessible everywhere but should not claim persistent screen real estate below desktop.

### Notifications and settings

Relevant files:

- [`apps/web/src/components/layout/notification-sheet.tsx`](../../../apps/web/src/components/layout/notification-sheet.tsx)
- [`apps/web/src/components/settings/settings-dialog.tsx`](../../../apps/web/src/components/settings/settings-dialog.tsx)
- [`apps/web/src/components/settings/settings-content.tsx`](../../../apps/web/src/components/settings/settings-content.tsx)

Rules:

- Notifications:
  - `phone`: bottom sheet opened from the navbar bell
  - `tablet`, `wideTablet`, `desktop`: right sheet opened from the same bell trigger
  - no persistent variant at any width
  - header actions remain visible while only the list body scrolls
- Settings:
  - `phone`: full-height dialog treatment with near-full viewport width and height
  - `tablet`: large centered dialog using most of the viewport, not a small desktop card
  - `wideTablet`, `desktop`: centered dialog with capped width and height
  - the visible trigger remains the navbar account/settings entry points
- Notifications and settings must preserve their existing trigger locations and stay fully operable with keyboard and touch input.
- Long tabbed settings content must keep only the content pane scrollable, with the title and tab strip remaining visible.
- Settings must not rely on fixed minimum heights that exceed the active viewport.

Acceptance criteria:

- the close affordance is always visible
- the content area scrolls without clipping the dialog header
- tab labels remain reachable on narrow widths through horizontal scrolling when needed

### Issue detail

Relevant file:

- [`apps/web/src/components/issue/issue-detail-layout.tsx`](../../../apps/web/src/components/issue/issue-detail-layout.tsx)

Rules:

- The timeline remains the primary surface on all narrow widths.
- The issue metadata sidebar should move out of the inline mobile flow and become a toggleable sheet or drawer.
- `wideTablet` does not need to restore a persistent issue sidebar in this pass.
- Desktop may retain the current persistent sidebar.

### PR detail

Relevant file:

- [`apps/web/src/components/pr/pr-detail-layout.tsx`](../../../apps/web/src/components/pr/pr-detail-layout.tsx)

Rules:

- Phone and tablet widths remain single-primary-surface experiences.
- Existing mobile tabbing behavior can remain, but breakpoint cleanup should ensure the tablet experience does not inherit cramped desktop assumptions.
- `wideTablet` should still avoid multiple simultaneous persistent side panels in this pass.
- Desktop split view remains the place for the existing resizable multi-pane experience.

This pass should improve breakpoint behavior and access to supporting surfaces, not redesign the PR review model into a new workspace system.

### Peek panels and side sheets in lists

Relevant files:

- [`apps/web/src/components/repo/commits-list.tsx`](../../../apps/web/src/components/repo/commits-list.tsx)
- [`apps/web/src/components/pr/prs-list.tsx`](../../../apps/web/src/components/pr/prs-list.tsx)

Rules:

- Phone widths should prefer bottom sheet or full-width sheet behavior.
- Tablet widths may use side sheets, but minimum widths must not exceed safe viewport space.
- Hardcoded desktop-oriented minimum widths should be reduced or made conditional.

### Ordinary tables and metadata panels

This pass includes the following general data surfaces:

- dashboard summary cards and tab panels
- repo overview metadata and summary panels
- repo insights summary cards and ordinary stats grids
- settings tab summary grids and forms
- notification list item metadata
- commit peek and PR peek metadata sections
- general list rows that primarily display metadata and actions rather than technical diff content

This pass does not structurally reflow:

- code viewers
- diff viewers
- file trees
- rendered markdown tables inside repository content
- patch or blame-style technical tables

Rules:

- Preserve true table layouts only where column relationships matter.
- Metadata-heavy panels should collapse into stacked rows or card sections on small screens.
- Small-screen layouts must preserve actions, labels, and navigation targets.

## Large Monitor Behavior

Large monitors are not a separate layout system. They are desktop layouts with improved breathing room.

Rules:

- Preserve the existing desktop shell model.
- Allow comfortable max widths and panel widths where the current UI benefits from them.
- Avoid stretching text-heavy surfaces to line lengths that hurt readability.
- Do not add extra persistent panels just because width exists.

## Width And Sizing Guidance

This pass should remove the most problematic fixed sizing without eliminating all intentional panel widths.

Guidance:

- Persistent hybrid-tablet side surfaces should generally stay in the `240px` to `288px` range unless the existing feature already requires more.
- Desktop resizable side surfaces may keep wider ranges where justified.
- Phone sheets should use near-full width or full width by default.
- Bottom sheets should cap height conservatively and keep internal content scrollable.
- Dialogs should respect safe viewport height and width before applying larger desktop max widths.

## Accessibility And Interaction Rules

- All sheet and drawer entry points must remain keyboard accessible.
- Every toggleable secondary surface must have a discoverable trigger in the visible UI.
- Close behavior should rely on Radix `Dialog` and `Sheet` semantics.
- Focus should move into open sheets and return to the trigger on close.
- Toggle icons must maintain tap-target sizes appropriate for phone use.

## Error Handling And Edge Cases

- If viewport-policy state is unavailable during SSR, render the mobile-first version and enhance after hydration.
- If a route offers multiple secondary surfaces, only one major surface may persist in `wideTablet`; the others must remain toggleable.
- If a persistent panel would reduce the main content below a readable width, the policy must downgrade it to sheet mode.
- If technical content overflows horizontally, preserve overflow behavior rather than forcing aggressive wrapping.
- If a sheet contains long content, the sheet body must scroll independently without trapping the navbar or underlying page in a broken state.

## Verification

Manual verification widths:

- `320`
- `375`
- `640`
- `768`
- `900`
- `1024`
- `1440`

Primary verification flows:

- dashboard
- repo overview
- repo code view with file explorer
- repo document view with outline
- issue detail
- PR detail
- notifications
- settings dialog
- Ghost chat
- commit and PR peek panels

Expected outcomes:

- Technical content remains readable and scrollable.
- Secondary surfaces remain accessible on all widths.
- No page depends on hover-only desktop affordances to expose essential navigation.
- General tables and metadata surfaces become easier to scan on phone widths.

## Test Strategy

Implementation planning should include focused tests for:

- the pure viewport/surface policy function
- any surface-mode mapping logic that decides `persistent` vs sheet variants
- any route-level helper that arbitrates the “one persistent major secondary surface” rule

Manual verification remains the primary acceptance mechanism for this pass because the changes are largely layout- and interaction-driven.

## Implementation Boundaries

This design is intentionally scoped for a single responsive-shell effort under `/(app)`.

It covers:

- shared viewport policy
- shell-level scroll and spacing cleanup
- responsive secondary-surface behavior for major authenticated routes
- mobile-friendly reflow of general data surfaces

It does not cover:

- public marketing pages
- unrelated feature refactors
- new navigation concepts outside the current shell
