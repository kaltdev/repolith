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

In this document, `drawer` means the same Radix-based `Sheet` primitive rendered from the left or right side.

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

## Route Coverage Matrix

This pass covers every authenticated route family under `/(app)` either through direct responsive-surface behavior or through shared shell improvements.

| Route family | Examples | RouteKind | Scope in this pass |
|---|---|---|---|
| dashboard | `/dashboard` | `dashboard` | Full shell and card/layout responsiveness |
| global discovery and list pages | `/search`, `/trending`, `/repos`, `/issues`, `/pulls`, `/stars`, `/orgs`, `/users`, `/notifications` | `listWithPeek` | Shared shell, stacked data surfaces, list/peek responsiveness where present |
| owner and profile detail pages | `/[owner]`, `/users/[username]`, `/stars/[username]`, `/orgs/[org]` | `listWithPeek` | Shared shell, card/grid responsiveness, stacked metadata surfaces |
| repo overview-style pages | `/repos/[owner]/[repo]`, `/activity`, `/insights`, `/security`, `/releases`, `/tags`, `/discussions`, `/people`, `/prompts`, `/settings` | `repoOverview` | Repo sidebar behavior, card/grid responsiveness, metadata-panel cleanup |
| repo-local issue and PR lists | `/repos/[owner]/[repo]/issues`, `/repos/[owner]/[repo]/pulls` | `listWithPeek` | Shared shell, stacked list metadata, peek/sheet responsiveness where present |
| repo code browsing pages | `/code`, `/tree/...` | `repoCode` | File explorer policy and technical-content overflow preservation |
| repo commit list pages | `/commits` | `listWithPeek` | Shared shell plus commit peek-sheet responsiveness |
| repo document and commit-detail pages | `/blob/...`, `/commits/[sha]` | `repoDocument` | File explorer or outline behavior plus technical-content overflow preservation |
| repo issue detail | `/repos/[owner]/[repo]/issues/[number]` | `issueDetail` | Metadata-sidebar responsiveness and main-thread priority |
| repo PR detail and subroutes | `/repos/[owner]/[repo]/pulls/[number]`, `/pulls/[number]/...` | `prDetail` | Single-primary-surface tablet behavior, desktop split preserved |
| repo record detail pages | `/repos/[owner]/[repo]/discussions/[number]`, `/prompts/[id]`, `/people/[username]`, `/releases/[tag]`, `/security/advisories/[ghsaId]` | `issueDetail` | Main content stays primary, supporting metadata surfaces remain toggleable |
| repo action and comparison pages | `/repos/[owner]/[repo]/actions`, `/actions/[runId]`, `/actions/compare`, `/actions/workflows/...` | `listWithPeek` | Shared shell, stacked metadata panels, technical tables keep overflow |
| repo authoring flows | `/repos/[owner]/[repo]/pulls/new`, `/pulls/new/[...sub]` | `modalOnly` | Shared shell, form responsiveness, dialog sizing, no new persistent side-surface work |
| authenticated single-page utilities | `/extension`, `/theme-store`, `/theme-store/[slug]`, `/theme-store/publish` | `modalOnly` | Shared shell and dialog sizing only; no new persistent side-surface work in this pass |

Route families not listed above are out of scope for feature-specific responsive work in this pass and only receive shared shell improvements if they inherit them automatically.

## Surface Policy Model

### Policy API

Implementation planning must center on:

- one pure policy function
- one shared viewport hook
- one global surface-state owner in the authenticated app shell
- one route-local surface-state owner per route wrapper that manages local surfaces
- one repo-surface coordinator mounted in the repo route layout for nested repo wrappers

Normative shape:

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
	| "metadataSidebar"
	| "notificationsPanel"
	| "settingsDialog";

type SurfaceMode =
	| "persistent"
	| "leftSheet"
	| "rightSheet"
	| "bottomSheet"
	| "modalDialog";

type ResponsiveSurfaceContext = {
	viewportWidth: number;
	routeKind: RouteKind;
	surfaceId: SurfaceId;
	requestedSurfaceWidth: number;
	shellGutters: number;
	anotherMajorSurfaceIsPersistent: boolean;
};

type ResponsiveSurfaceDecision = {
	viewport: ResponsiveViewport;
	mainContentMinWidth: number;
	canPersistPrimarySecondary: boolean;
	mode: SurfaceMode;
	shouldPromoteIfOpen: boolean;
	shouldRemainOpenAcrossModeChange: boolean;
	shouldCloseOnRouteChange: boolean;
};
```

The pure function decides:

- `viewport`
- whether one major surface may persist
- the mode for the requested surface
- whether the surface must be downgraded to sheet mode
- whether an open surface should promote, remain open, or close during state transitions

The hook reads window size and exposes the policy inputs to client components.

Ownership:

- the shared hook owns viewport classification
- route wrappers provide `routeKind`
- each surface owner provides its preferred width
- the policy function returns the final mode
- the global surface-state owner manages `ghostChat`, `notificationsPanel`, and `settingsDialog`
- the route-local surface-state owner manages `repoSidebar`, `fileExplorer`, `documentOutline`, `detailPeek`, and `metadataSidebar`
- the state owner, not the policy function, preserves open state while the mode changes
- the repo route layout hosts the repo-surface coordinator that arbitrates `repoSidebar`, `fileExplorer`, and `documentOutline` across nested repo wrappers such as `RepoLayoutWrapper` and `CodeContentWrapper`

### Canonical policy inputs

To keep the pure function deterministic across routes, planning should use these canonical inputs unless a route documents a narrower override:

- `repoSidebar.requestedSurfaceWidth = 280`
- `fileExplorer.requestedSurfaceWidth = 240`
- `documentOutline.requestedSurfaceWidth = 280`
- `metadataSidebar.requestedSurfaceWidth = 280`
- `ghostChat.requestedSurfaceWidth = 380`
- `notificationsPanel.requestedSurfaceWidth = 400`
- `settingsDialog.requestedSurfaceWidth = 720`
- `detailPeek.requestedSurfaceWidth = 700`
- `shellGutters = 32` for phone, tablet, and wideTablet calculations

Only `repoSidebar` and `fileExplorer` participate in persistent-slot calculations below desktop. The remaining values exist so sheet sizing and downgrade logic use stable test inputs.

### State-owner interfaces

The state owners and coordinator should stay lean and explicit.

Required responsibilities:

- global surface owner
  - owns open state for `ghostChat`, `notificationsPanel`, and `settingsDialog`
  - exposes `openGlobalSurface(id)`, `closeGlobalSurface(id)`, and `getOpenGlobalSurface()`
- route-local surface owner
  - owns open state for local sheets and local persistent-surface visibility
  - exposes `openLocalSurface(id)`, `closeLocalSurface(id)`, and `isLocalSurfaceOpen(id)`
- repo-surface coordinator
  - lives in the repo route layout
  - arbitrates `repoSidebar`, `fileExplorer`, and `documentOutline`
  - exposes `claimPersistentSurface(id)`, `releasePersistentSurface(id)`, and `getPersistentSurface()`
  - owns no global UI state outside repo routes

Width state ownership:

- `RepoLayoutWrapper` continues to own persisted repo-sidebar width and collapse state
- `CodeContentWrapper` continues to own file-explorer width state
- `PRDetailLayout` continues to own PR split-ratio state

The coordinator consumes those existing states when deciding visibility and persistence; it does not replace their storage model in this pass.

### Global and local arbitration rules

The global and route-local surface owners must follow one shared arbitration contract.

Rules:

- `settingsDialog` is modal and exclusive. Opening it closes `ghostChat`, `notificationsPanel`, and any non-persistent route-local sheet.
- `ghostChat`, `notificationsPanel`, and any non-persistent route-local sheet are mutually exclusive. Opening one closes the others.
- One persistent route-local surface may coexist with one global non-modal surface.
- If a persistent local surface is downgraded to sheet mode while a global non-modal surface is already open, the downgraded local surface closes instead of opening a second sheet.
- If a route-local sheet is open and a higher-priority local surface claims the persistent slot, the lower-priority local surface closes unless it already owns the persistent slot.
- Route transitions always clear route-local open state. Global surface state may survive only when explicitly allowed by the runtime rules above.

### Overlay and z-index precedence

Overlay precedence must be deterministic so nested surfaces never compete for focus or stacking order.

Priority order:

1. `settingsDialog`
2. global and route-local non-persistent sheets
3. persistent side surfaces
4. page content

Rules:

- `settingsDialog` always renders above every other surface and makes the rest of the shell inert.
- Any non-persistent sheet renders above persistent side surfaces.
- Two non-persistent sheets must never remain open together; the arbitration rules above close the lower-priority surface first.
- Persistent surfaces never render overlays above page content.

### Persistent-surface eligibility

Only these surfaces are eligible to claim the one persistent major-secondary slot below desktop:

- `fileExplorer`
- `repoSidebar`

In this design, a `major` secondary surface is a surface that can materially reduce the readable width of the main content when kept persistently visible. For this pass, only `fileExplorer` and `repoSidebar` are major secondary surfaces.

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
- `modalOnly`: `560px`

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
- If a sheet-based `fileExplorer` or `repoSidebar` becomes eligible for persistence after resize, it must promote into the persistent slot without losing its visible state.
- If an open non-persistent surface changes only sheet side across breakpoints, it remains open and switches sides in place.
- If navigation leaves the route family that owns a local surface, that local surface closes.
- Global Ghost chat may remain open across route transitions, but it must still obey the viewport-specific mode after navigation.
- Notifications and settings keep their open state only within the interaction that opened them; route navigation closes them.
- Entering a route that activates a higher-priority persistent candidate must evict a lower-priority candidate back to sheet mode.
- Only one major persistent surface may exist at a time in `wideTablet`.

### Manual-close behavior across resize

If a user explicitly closes a surface, resize alone must not reopen it.

Rules:

- A manually closed `fileExplorer` or `repoSidebar` remains closed when crossing between `tablet`, `wideTablet`, and `desktop` until the user reopens it.
- A surface that is open may change mode across resize without losing its open state.
- Automatic promotion to persistent mode happens only for surfaces that were already open.
- Automatic downgrade from persistent to sheet mode preserves openness only if the surface was open before the breakpoint change.
- Ordinary sheet-to-sheet transitions such as `bottomSheet` to `rightSheet` preserve openness only when the surface was open before the transition.

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

- `phone`: repo sidebar is a `rightSheet` triggered from the page header or toolbar.
- `tablet`: repo sidebar remains a `rightSheet`, not persistent.
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

- `phone`: `bottomSheet`
- `tablet`: `rightSheet`
- `wideTablet`: `rightSheet`
- `desktop`: persistent inline support surface on repo document pages

The outline is never the one persistent major secondary surface in hybrid tablet mode.

### Ghost chat

Relevant file:

- [`apps/web/src/components/shared/global-chat-panel.tsx`](../../../apps/web/src/components/shared/global-chat-panel.tsx)

Rules:

- `phone`: `bottomSheet`
- `tablet`: `rightSheet`
- `wideTablet`: `rightSheet`
- `desktop`: `rightSheet`

Ghost chat should remain accessible everywhere but should not claim persistent screen real estate below desktop.

### Notifications and settings

Relevant files:

- [`apps/web/src/components/layout/notification-sheet.tsx`](../../../apps/web/src/components/layout/notification-sheet.tsx)
- [`apps/web/src/components/settings/settings-dialog.tsx`](../../../apps/web/src/components/settings/settings-dialog.tsx)
- [`apps/web/src/components/settings/settings-content.tsx`](../../../apps/web/src/components/settings/settings-content.tsx)

Rules:

- Notifications:
  - `phone`: `bottomSheet`
  - `tablet`, `wideTablet`, `desktop`: `rightSheet`
  - no persistent variant at any width
  - surface id: `notificationsPanel`
  - header actions remain visible while only the list body scrolls
- Settings:
  - `phone`: `modalDialog` with near-full viewport width and height
  - `tablet`: `modalDialog` using most of the viewport, not a small desktop card
  - `wideTablet`, `desktop`: `modalDialog` with capped width and height
  - surface id: `settingsDialog`
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
- The issue metadata sidebar should move out of the inline mobile flow and become a `bottomSheet` on `phone` and a `rightSheet` on `tablet` and `wideTablet`.
- `wideTablet` does not need to restore a persistent issue sidebar in this pass.
- Desktop may retain the current persistent sidebar.

### PR detail

Relevant file:

- [`apps/web/src/components/pr/pr-detail-layout.tsx`](../../../apps/web/src/components/pr/pr-detail-layout.tsx)

Rules:

- `phone` and `tablet` remain single-primary-surface experiences.
- The top-level non-desktop surface switch remains `diff` versus `chat`.
- Inside `chat`, the existing `conversation` versus `overview` choice remains available as an in-panel segmented control rather than as a second simultaneous side panel.
- `wideTablet` still avoids multiple persistent side panels in this pass and continues to use one visible primary surface at a time.
- Desktop split view remains the place for the existing resizable multi-pane experience.
- Desktop keeps the current left diff panel and right conversation/overview side panel model.
- Conflict mode remains a full-width takeover at all widths and bypasses the normal persistent-side-surface rules.
- If a file-targeting navigation event occurs while a non-desktop PR detail page is showing `chat`, the layout should switch back to the `diff` surface so the requested file is visible.

This pass should improve breakpoint behavior and access to supporting surfaces, not redesign the PR review model into a new workspace system.

### Peek panels and side sheets in lists

Relevant files:

- [`apps/web/src/components/repo/commits-list.tsx`](../../../apps/web/src/components/repo/commits-list.tsx)
- [`apps/web/src/components/pr/prs-list.tsx`](../../../apps/web/src/components/pr/prs-list.tsx)

Rules:

- `phone`: `bottomSheet`
- `tablet`, `wideTablet`, `desktop`: `rightSheet`
- Sheet widths must remain within safe viewport space and must not rely on desktop-oriented minimum widths.
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
- `639`
- `640`
- `768`
- `895`
- `896`
- `900`
- `1023`
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
- Resize and rotation preserve open-surface intent while correctly changing mode.
- Focus returns to the triggering control when a sheet or dialog closes.
- In `wideTablet`, promoting one major secondary surface evicts any lower-priority persistent candidate.

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
