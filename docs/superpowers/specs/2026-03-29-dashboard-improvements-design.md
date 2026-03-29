# Dashboard Improvements Design

## Scope

Implement five dashboard improvements for the existing GitHub-like web application without changing the current design system tokens, component styles, spacing, typography, color system, or UI primitives. The work must stay within the existing stack, using `nuqs` for shareable URL state, React Query for remote mutable state and async data, and the existing design-system components for all UI. The only new dependencies allowed are `@dnd-kit/core` and `@dnd-kit/sortable`.

The feature set includes:

1. Personal dashboard widget reordering with persistence.
2. Activity feed filtering with URL-synced controls.
3. Card-level quick actions with optimistic updates.
4. Saved searches with backend persistence and local fallback.
5. Team dashboard mode inside the existing dashboard route.

## Goals

- Preserve the current dashboard appearance and component language while adding new behavior.
- Keep new logic isolated in focused hooks and composable components.
- Use URL params only for state that should be deep-linkable or bookmarkable.
- Use localStorage only for user-local preferences and offline fallback state.
- Respect the current permission model and existing API/service boundaries.
- Ensure one broken widget cannot crash the entire dashboard.

## Non-Goals

- No redesign of the dashboard, search page, cards, or shared component library.
- No new backend endpoint design beyond the saved-search API contract already specified.
- No migration of unrelated dashboard code into a new architecture.
- No additional third-party dependencies beyond the approved `@dnd-kit` packages.

## Existing Repo Context

- The current dashboard entrypoint is [apps/web/src/app/(app)/dashboard/page.tsx](/home/raditya/projects/repolith/apps/web/src/app/(app)/dashboard/page.tsx), which server-fetches personal dashboard data and renders `DashboardContent`.
- The current client shell is [apps/web/src/components/dashboard/dashboard-content.tsx](/home/raditya/projects/repolith/apps/web/src/components/dashboard/dashboard-content.tsx), which currently combines the personal dashboard header and content.
- Search and several list pages already use `nuqs` query-state patterns.
- React Query is already available and used across the app for data fetching and mutations.
- Existing org-related service functions are already present in [apps/web/src/lib/github.ts](/home/raditya/projects/repolith/apps/web/src/lib/github.ts), including `getUserOrgs`, `getOrg`, `getOrgRepos`, `getOrgMembers`, `getUserEvents`, `searchIssues`, `getNotifications`, and `getTrendingRepos`.
- No drag-and-drop package is currently installed in `package.json`, so the approved `@dnd-kit/core` and `@dnd-kit/sortable` packages will be added.

## Recommended Approach

Use a thin composition layer on top of existing dashboard primitives rather than refactoring the entire dashboard into a new generic framework.

This means:

- `DashboardContent` stays as the top-level client shell.
- New features are introduced via focused hooks and dashboard-specific wrapper components.
- Existing card rendering and existing data-fetching patterns are preserved where possible.
- Shared behavior such as optimistic mutation handling, URL-synced filters, and widget persistence is abstracted only where it is reused.

This approach keeps the risk localized, preserves the current UI, and matches the repo’s existing feature-oriented structure.

## Architecture

### Top-Level Dashboard Structure

The dashboard remains on `/dashboard`. It gains a `view` query parameter managed through `nuqs`:

- `view=personal` for the existing personal dashboard.
- `view=team` for the new team dashboard mode.

The header gains a Personal/Team toggle built with existing UI primitives. The Team toggle only renders if the authenticated user belongs to at least one organization. No separate `/dashboard/team` route is introduced.

### Personal Dashboard Composition

The Personal dashboard is restructured around a sortable widget layout:

- `DashboardLayout` owns widget ordering and rendering.
- Each widget is registered with a stable ID, title metadata, and render function.
- The default widget order is:
  - `review-requests`
  - `my-pull-requests`
  - `my-issues`
  - `activity-feed`
  - `trending-repositories`
  - `saved-searches`

Widgets preserve their current content and appearance, but can be reordered inside the layout.

### Widget Isolation

Each widget is rendered inside:

- a sortable wrapper (`DraggableWidget`),
- a local widget error boundary,
- and, where applicable, a local loading boundary.

This ensures one widget failure does not break the rest of the dashboard.

### Team Dashboard Composition

The Team dashboard is a sibling view rendered inside the same dashboard shell. It contains:

- `TeamSelector`
- `TeamMetricsBar`
- `TeamActivityFeed`
- `OpenPRsPanel`
- `TopContributors`

These sections follow the existing dashboard grid and spacing patterns rather than introducing a new layout system.

## State Ownership and Data Flow

### URL State

`nuqs` is the source of truth for state that should be shareable:

- `view` for Personal vs Team dashboard mode.
- Activity filter params for personal and team activity feeds.
- Any filter state that should be bookmarkable or shareable.

Personal activity filters use query params such as:

- `activity_type=push,review`
- `repo=myorg/myrepo`
- `range=7d`
- `from=2026-03-01`
- `to=2026-03-29`

`useActivityFilters` normalizes this into a typed filter object and exposes setters, clear handlers, and active-filter metadata for chips.

### localStorage State

`localStorage` owns user-local preferences and offline fallback state:

- `dashboard_widget_order` stores personal widget order.
- `dashboard_team_selection` stores the selected org/team.
- A saved-search fallback key stores locally-created or locally-updated searches when the API is unavailable.

`useDashboardLayout` validates saved widget IDs against the current widget registry and falls back cleanly if storage is missing or stale.

### Server and Mutable State

React Query owns remote mutable resources and async dashboard widgets:

- Saved-search CRUD.
- Team dashboard queries.
- Quick-action mutations.
- Any activity feed refetch that depends on normalized filters rather than preloaded data.

The server-rendered dashboard page continues to fetch the baseline personal data in parallel and passes it as initial props into the client shell. Client hooks layer interactive behavior on top of that initial state.

## Feature Design

### Feature 1: Customizable Dashboard Widgets

#### Hook

`useDashboardLayout` will:

- expose the default widget order,
- initialize from `localStorage`,
- sanitize unknown or missing widget IDs,
- support reorder updates,
- persist updates to `dashboard_widget_order`,
- and expose `resetLayout`, which restores the default order and clears storage.

#### Components

- `DraggableWidget.tsx` wraps each widget in `useSortable`.
- `DashboardLayout.tsx` sets up `DndContext`, `SortableContext`, sensors, overlay state, and ordered rendering.

#### Drag-and-Drop Behavior

- Use `@dnd-kit/core` and `@dnd-kit/sortable`.
- Support pointer and keyboard sensors.
- Each widget has a visible drag handle using the existing icon set.
- The active drop target shows a subtle dashed border/outline using existing border utilities only.
- Reordering updates local state immediately and persists after drag end.
- Keyboard users can focus the handle, start drag, and reorder accessibly.

### Feature 2: Activity Feed Filtering

#### Hook

`useActivityFilters` will:

- read filter state from `nuqs`,
- expose typed setters for event types, repository, and date range,
- derive whether filters are active,
- generate chip models for rendering active filters,
- and support clearing one filter or all filters.

#### Components

- `ActivityFilterBar.tsx` renders:
  - event-type multi-select controls,
  - repository searchable dropdown,
  - range preset controls,
  - custom date inputs for the custom range mode.
- `ActivityFilterChip.tsx` renders dismissible active-filter chips.
- `ActivityFeed.tsx` integrates the filter bar and filtered list.

#### Filtering Strategy

- If the widget already has the relevant activity items in memory, filtering is applied client-side with memoized predicates.
- If the team activity feed depends on org-scoped remote data, the same normalized filter object becomes part of the React Query key and drives a refetch.
- Empty results reuse the existing empty-state pattern with a contextual message.

### Feature 3: Quick Actions on Dashboard Cards

#### Hook

`useQuickAction` provides mutation helpers for:

- starting reviews,
- approving reviews,
- requesting changes,
- navigating to files or PRs,
- merging PRs,
- closing PRs,
- closing issues,
- and submitting issue comments.

The hook centralizes:

- optimistic cache updates,
- rollback on failure,
- success and error toast dispatch,
- and query invalidation on settle.

#### Components

- `QuickActionBar.tsx` provides the shared action-row layout.
- `InlineCommentComposer.tsx` provides the inline issue comment composer.
- Existing card components are extended in place:
  - `ReviewRequestCard.tsx`
  - `PullRequestCard.tsx`
  - `IssueCard.tsx`

#### Behavior Rules

- The action row is hover-revealed on pointer devices.
- On touch/coarse pointer devices, the actions remain visible.
- Destructive actions require inline confirmation via the existing `Popover` component.
- Merge is disabled when not mergeable and explains why through the existing `Tooltip`.
- Add Comment opens an inline `Textarea` composer with Submit and Cancel actions.
- Existing API/service functions must be called instead of duplicating request logic.

### Feature 4: Saved Searches

#### Hook

`useSavedSearches` owns:

- loading saved searches from the API,
- creating a saved search,
- renaming it,
- deleting it,
- tracking last-used timestamps,
- enforcing the max 20 item limit,
- and falling back to localStorage when the saved-search API is unavailable.

The hook exposes:

- `savedSearches`
- `canSave`
- `createSavedSearch`
- `renameSavedSearch`
- `deleteSavedSearch`
- `markUsed`
- `isSyncPending`
- `limitReached`

#### Fallback Behavior

If any saved-search API operation fails because the backend is unavailable:

- the mutation is stored in localStorage,
- affected items are marked with a visible “Sync pending” state,
- the dashboard widget still renders the fallback data,
- and the “Save this search” control respects the 20-item limit across both remote and pending items.

#### Components

- `SaveSearchButton.tsx` appears on the search results page or within the existing global search results surface.
- `SavedSearchesWidget.tsx` becomes a new personal dashboard widget.
- `SavedSearchItem.tsx` supports:
  - inline rename on click,
  - Enter and blur to confirm,
  - Escape to cancel,
  - delete confirmation before removal,
  - navigation back to the correct search query and scope.

### Feature 5: Team Dashboard

#### Hook

`useTeamDashboard` owns:

- loading the current user’s organizations,
- loading org teams where existing APIs support it,
- persisting org/team selection to `dashboard_team_selection`,
- building filter-aware React Query keys,
- and fetching all team dashboard sections in parallel.

#### Team Selector

`TeamSelector.tsx` provides an org/team picker using the existing dropdown/combobox primitives. The selected org is required. The selected team is optional if the org-level view is supported without a narrower team filter.

#### Team Sections

- `TeamActivityFeed.tsx`
  - Reuses `ActivityFilterBar`.
  - Adapts filters for org or team scope.
- `TeamMetricsBar.tsx`
  - Shows PR and issue metrics, review turnaround, and active contributors for the selected period.
- `OpenPRsPanel.tsx`
  - Shows org PRs that have no reviewers or have been waiting more than 24 hours.
- `TopContributors.tsx`
  - Renders ranked contributors using existing `Avatar` and `Badge` components.

#### Data Sources

No new backend endpoints are designed for team dashboard data. The implementation must consume the existing org/team-capable service layer and API surfaces already supported by the repo. If existing service helpers are missing for a required org/team query, a thin wrapper should be added in the existing service layer rather than duplicating fetch logic inside UI components.

## Accessibility

- Drag handles are buttons with explicit accessible labels.
- Sortable widgets support keyboard drag interactions through `dnd-kit` keyboard sensors.
- Focus returns to the moved widget after reordering.
- Filter chips have dismiss buttons with descriptive labels.
- Inline rename and comment composition support Enter, Escape, blur confirmation, and focus management.
- Popover confirmations and tooltips use existing accessible primitives.
- All icon-only controls include `aria-label`.

## Error Handling

- Each widget is wrapped in a local error boundary.
- Errors in a widget render a widget-local fallback instead of crashing the dashboard.
- Mutation failures roll back optimistic updates where applicable.
- Saved-search API failures degrade to local fallback state rather than disabling the feature entirely.
- Team widgets handle permission or missing-data failures independently.

## Performance

- Personal dashboard server fetches remain parallelized in the page entrypoint.
- Team dashboard queries run in parallel with React Query.
- Client-side filtering is preferred when the current widget already has the required data.
- Heavy widgets can be lazy-loaded behind `Suspense` if they materially reduce initial client work.
- Query keys must include only normalized filter values to avoid unnecessary refetch churn.

## Testing Strategy

### Unit Tests

Add unit tests for:

- `useDashboardLayout`
- `useActivityFilters`
- `useQuickAction`
- `useSavedSearches`
- `useTeamDashboard`

Coverage should focus on:

- storage initialization and reset behavior,
- query-param normalization,
- optimistic update and rollback behavior,
- saved-search fallback state,
- team selection persistence and parallel query orchestration.

### Integration Tests

Add integration tests for:

- personal dashboard widget reorder flow, including persistence to `dashboard_widget_order`,
- saved-search create/rename/delete flow, including fallback mode when the API is unavailable.

Where drag-and-drop interactions are difficult to simulate directly, test both:

- the state transition through the layout hook,
- and the rendered order change through the component boundary.

## File Plan

### New Files

- `apps/web/src/hooks/useDashboardLayout.ts`
- `apps/web/src/components/dashboard/DraggableWidget.tsx`
- `apps/web/src/components/dashboard/DashboardLayout.tsx`
- `apps/web/src/hooks/useActivityFilters.ts`
- `apps/web/src/components/dashboard/ActivityFilterBar.tsx`
- `apps/web/src/components/dashboard/ActivityFilterChip.tsx`
- `apps/web/src/components/dashboard/cards/QuickActionBar.tsx`
- `apps/web/src/components/dashboard/cards/InlineCommentComposer.tsx`
- `apps/web/src/hooks/useQuickAction.ts`
- `apps/web/src/hooks/useSavedSearches.ts`
- `apps/web/src/components/dashboard/SavedSearchesWidget.tsx`
- `apps/web/src/components/dashboard/SavedSearchItem.tsx`
- `apps/web/src/components/search/SaveSearchButton.tsx`
- `apps/web/src/components/dashboard/TeamDashboard.tsx`
- `apps/web/src/components/dashboard/TeamActivityFeed.tsx`
- `apps/web/src/components/dashboard/TeamMetricsBar.tsx`
- `apps/web/src/components/dashboard/OpenPRsPanel.tsx`
- `apps/web/src/components/dashboard/TopContributors.tsx`
- `apps/web/src/components/dashboard/TeamSelector.tsx`
- `apps/web/src/hooks/useTeamDashboard.ts`

### Modified Files

- `apps/web/src/app/(app)/dashboard/page.tsx`
- `apps/web/src/components/dashboard/dashboard-content.tsx`
- `apps/web/src/components/dashboard/ActivityFeed.tsx`, which will be introduced as the dedicated activity widget component and wired into `DashboardLayout`
- `apps/web/src/components/dashboard/cards/ReviewRequestCard.tsx`
- `apps/web/src/components/dashboard/cards/PullRequestCard.tsx`
- `apps/web/src/components/dashboard/cards/IssueCard.tsx`
- `apps/web/src/components/search/search-content.tsx` or the closest existing search results entry component where the save action belongs
- relevant `types/` files needed for dashboard widget IDs, activity filter models, saved-search records, and team dashboard models
- `apps/web/package.json` for the two approved `@dnd-kit` dependencies

## Open Implementation Assumptions

- The Team dashboard will be hidden entirely when the authenticated user has no organizations.
- Team filtering will reuse the activity filter model, with org/team-specific repository options derived from the selected scope.
- Existing service functions for PR review, merge, close, and comment flows either already exist or can be added as thin wrappers in the current service/action layer without inventing new backend contracts.
- The saved-search API contract provided in the request is authoritative for backend integration.

## Acceptance Criteria

The work is complete when:

- Personal widgets reorder via drag-and-drop, persist locally, and can be reset.
- Activity filters are URL-synced, dismissible, and affect activity results correctly.
- Quick actions work from dashboard cards with confirmation, tooltips, optimistic updates, and toast feedback.
- Saved searches can be created, renamed, deleted, deep-linked, and fall back to localStorage with visible sync-pending status.
- Team mode is available through a `view` query param on `/dashboard`, only for users with org membership, and renders all required team sections with loading skeletons and permission-respecting data.
- All new hooks have unit tests and the required end-to-end dashboard flows have integration coverage.
