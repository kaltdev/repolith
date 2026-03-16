# Repo Layout Responsive Refresh Design

Date: 2026-03-17
Status: Approved for planning

## Summary

Refreshing a repo page on desktop can briefly render the compact mobile or tablet repo header before the responsive viewport width is known on the client.

That flash exposes controls intended only for smaller layouts, including the compact `Star`, `Fork`, and `View more` actions inside the repo layout wrapper.

The fix will keep the existing responsive surface policy unchanged and suppress the compact header until the responsive surface provider reports a ready client width.

## Goals

- Prevent the compact repo header from appearing on desktop during initial render or hard refresh.
- Preserve the current persistent repo sidebar behavior on desktop.
- Preserve the current wide-tablet overview behavior where the repo sidebar remains persistent when there is enough room.
- Preserve the compact summary actions on tablet and mobile once the responsive viewport is known.

## Non-Goals

- Changing the responsive surface policy thresholds
- Changing repo sidebar persistence rules
- Redesigning the compact summary UI
- Refactoring unrelated responsive wrappers

## Scope

This change applies to every route that renders [`RepoLayoutWrapper`](../../../apps/web/src/components/repo/repo-layout-wrapper.tsx), not only the repo overview page.

In scope:

- repo overview routes that can show the compact summary header
- code-like repo routes that still use the wrapper while forcing the sidebar into sheet mode
- PR routes and other collapsed-sidebar cases that flow through the same wrapper logic

Out of scope:

- changing whether PR pages start collapsed
- changing how code routes choose sheet versus persistent behavior
- eliminating all initial layout shift before `isReady`

The accepted tradeoff is that desktop may briefly omit the compact header while responsive state is unresolved. That is acceptable because the bug to prevent is showing the wrong mobile or tablet controls on desktop.

## Current State

Relevant files:

- [`apps/web/src/components/repo/repo-layout-wrapper.tsx`](../../../apps/web/src/components/repo/repo-layout-wrapper.tsx)
- [`apps/web/src/components/shared/responsive-surface-provider.tsx`](../../../apps/web/src/components/shared/responsive-surface-provider.tsx)
- [`apps/web/src/lib/responsive-surface-policy.ts`](../../../apps/web/src/lib/responsive-surface-policy.ts)

`RepoLayoutWrapper` currently reads `width` from `useResponsiveSurfaceContext()` and immediately derives a surface mode from that width.

During SSR and the earliest hydration pass, the provider starts with `width = 0` before `window.innerWidth` is measured on the client. That causes the wrapper to transiently choose a non-persistent mode, which renders the compact repo header and its mobile or tablet-only actions.

Once the effect runs and width updates, the wrapper switches back to the correct persistent desktop mode. The issue is the initial incorrect render, not the steady-state layout.

## Decision

`RepoLayoutWrapper` will treat responsive mode as unresolved until `useResponsiveSurfaceContext().isReady` is `true`.

While unresolved:

- the compact repo header will not render
- the compact summary actions will not render
- all other layout branches continue to behave exactly as they do today
- the existing responsive surface policy remains the source of truth once width is available

After readiness:

- desktop keeps the persistent repo sidebar behavior it has today
- wide-tablet repo overview keeps the current persistent-sidebar behavior when space allows
- tablet and phone keep the compact header and sheet-based sidebar behavior
- collapsed desktop states, including PR routes that start collapsed, must also avoid rendering the compact `Star`, `Fork`, and `View more` controls during refresh

## Implementation

The change is intentionally narrow and limited to [`apps/web/src/components/repo/repo-layout-wrapper.tsx`](../../../apps/web/src/components/repo/repo-layout-wrapper.tsx).

Implementation steps:

1. Read `isReady` alongside `width` from `useResponsiveSurfaceContext()`.
2. Gate the compact repo header so it only renders when responsive state is ready and the sidebar mode is non-persistent.
3. Do not defer or rewrite other mode-driven branches such as the persistent-versus-sheet shell, wrapper flex direction, or breadcrumb portal behavior.
4. Leave `getResponsiveSurfaceDecision()` and its thresholds unchanged.

This avoids introducing server-side viewport guessing or breakpoint-specific CSS patches that would mask, rather than fix, the underlying initial render mismatch.

## Risks And Mitigations

- Risk: tablet or phone users could briefly lose the compact summary actions during hydration.
  Mitigation: the compact header appears as soon as the provider measures `window.innerWidth`; this is preferable to showing the wrong desktop-incompatible UI on refresh.

- Risk: changing the policy logic could alter wide-tablet behavior.
  Mitigation: the policy module is not part of this change.

- Risk: implementers could over-apply `isReady` and delay unrelated layout branches.
  Mitigation: the readiness gate is limited to compact header rendering only; other branches remain unchanged and any transient absence of the eventual desktop sidebar remains acceptable in this change.

## Verification

Manual verification:

1. Open a repo overview page on desktop with the sidebar expanded and hard refresh.
2. Confirm the compact `Star`, `Fork`, and `View more` controls do not appear during refresh.
3. Open a desktop code-like repo route that uses the wrapper and hard refresh.
4. Confirm the compact controls do not appear there either.
5. Open a desktop PR route, or any desktop state where the repo sidebar starts collapsed, and hard refresh.
6. Confirm the compact controls still do not appear while the sidebar is collapsed.
7. Open the same repo on tablet or phone width and confirm the compact header appears after hydration.
8. Confirm wide-tablet overview still promotes the persistent repo sidebar when space allows.

Automated verification:

- Add one focused Vitest regression test for the compact-header visibility decision.
- The implementation may extract a tiny pure helper that answers whether the compact repo header should render from `isReady`, `isPersistentSidebar`, and header-content presence so the test stays unit-level and does not require a new React component test harness.
- Cover at least these cases in that test: unresolved state hides the compact header, persistent desktop hides it, and ready non-persistent state shows it.
- Existing responsive-surface-policy tests should remain unchanged because the policy module itself is not being modified.
