# Dashboard Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the five approved dashboard improvements on top of the existing dashboard without changing the design system, while keeping state shareable with `nuqs`, remote mutations on React Query, and drag-and-drop on `@dnd-kit`.

**Architecture:** Keep [apps/web/src/components/dashboard/dashboard-content.tsx](/home/raditya/projects/repolith/apps/web/src/components/dashboard/dashboard-content.tsx) as the client shell, but split new behavior into focused hooks and widget-sized components. Personal dashboard changes are layered through a sortable `DashboardLayout`; Team mode is a sibling dashboard surface selected through a `view` search param on `/dashboard`.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Bun test runner with Vitest-style APIs, `nuqs`, TanStack React Query, Radix-based design-system primitives, `@dnd-kit/core`, `@dnd-kit/sortable`

---

## File Structure

### Create

- `apps/web/src/hooks/use-dashboard-layout.ts`
- `apps/web/src/hooks/use-activity-filters.ts`
- `apps/web/src/hooks/use-quick-action.ts`
- `apps/web/src/hooks/use-saved-searches.ts`
- `apps/web/src/hooks/use-team-dashboard.ts`
- `apps/web/src/components/dashboard/dashboard-layout.tsx`
- `apps/web/src/components/dashboard/draggable-widget.tsx`
- `apps/web/src/components/dashboard/widget-error-boundary.tsx`
- `apps/web/src/components/dashboard/activity-feed.tsx`
- `apps/web/src/components/dashboard/activity-filter-bar.tsx`
- `apps/web/src/components/dashboard/activity-filter-chip.tsx`
- `apps/web/src/components/dashboard/saved-searches-widget.tsx`
- `apps/web/src/components/dashboard/saved-search-item.tsx`
- `apps/web/src/components/dashboard/team-dashboard.tsx`
- `apps/web/src/components/dashboard/team-activity-feed.tsx`
- `apps/web/src/components/dashboard/team-metrics-bar.tsx`
- `apps/web/src/components/dashboard/open-prs-panel.tsx`
- `apps/web/src/components/dashboard/top-contributors.tsx`
- `apps/web/src/components/dashboard/team-selector.tsx`
- `apps/web/src/components/dashboard/cards/review-request-card.tsx`
- `apps/web/src/components/dashboard/cards/pull-request-card.tsx`
- `apps/web/src/components/dashboard/cards/issue-card.tsx`
- `apps/web/src/components/dashboard/cards/quick-action-bar.tsx`
- `apps/web/src/components/dashboard/cards/inline-comment-composer.tsx`
- `apps/web/src/components/search/save-search-button.tsx`
- `apps/web/src/types/dashboard.ts`
- `apps/web/src/hooks/use-dashboard-layout.test.ts`
- `apps/web/src/hooks/use-activity-filters.test.ts`
- `apps/web/src/hooks/use-quick-action.test.ts`
- `apps/web/src/hooks/use-saved-searches.test.ts`
- `apps/web/src/hooks/use-team-dashboard.test.ts`
- `apps/web/src/components/dashboard/dashboard-layout.test.tsx`
- `apps/web/src/components/dashboard/saved-searches-widget.test.tsx`

### Modify

- `apps/web/package.json`
- `apps/web/src/app/(app)/dashboard/page.tsx`
- `apps/web/src/app/(app)/dashboard/page.test.ts`
- `apps/web/src/components/dashboard/dashboard-content.tsx`
- `apps/web/src/components/search/search-content.tsx`
- `apps/web/src/lib/github.ts`

### Responsibilities

- `types/dashboard.ts` defines dashboard widget IDs, activity filter models, saved search records, and team dashboard result shapes.
- `use-dashboard-layout.ts` owns personal widget ordering and `localStorage` persistence.
- `use-activity-filters.ts` owns URL-synced filter parsing and serialization.
- `use-quick-action.ts` owns optimistic mutations, rollback, and toast integration for card actions.
- `use-saved-searches.ts` owns saved-search CRUD, fallback storage, and the 20-item limit.
- `use-team-dashboard.ts` owns org/team selection persistence and all Team query orchestration.
- `dashboard-layout.tsx` and `draggable-widget.tsx` own widget composition and sorting.
- the dashboard card files own UI composition for review, PR, and issue cards, using the shared quick action row and inline comment composer.

### Scope Note

The approved spec covers five largely independent subsystems. This plan keeps them in one document because the user requested sequential delivery, but each task is independently shippable and testable.

## Task 1: Add Shared Dashboard Types and Approved Dependencies

**Files:**
- Create: `apps/web/src/types/dashboard.ts`
- Modify: `apps/web/package.json`
- Test: `apps/web/src/hooks/use-dashboard-layout.test.ts`

- [ ] **Step 1: Write the failing type-driven hook test**

```ts
import { describe, expect, it } from "vitest";
import { DEFAULT_DASHBOARD_WIDGET_ORDER } from "@/types/dashboard";

describe("dashboard type contract", () => {
	it("keeps the approved personal widget order stable", () => {
		expect(DEFAULT_DASHBOARD_WIDGET_ORDER).toEqual([
			"review-requests",
			"my-pull-requests",
			"my-issues",
			"activity-feed",
			"trending-repositories",
			"saved-searches",
		]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/hooks/use-dashboard-layout.test.ts`

Expected: FAIL with a module resolution error for `@/types/dashboard` or missing `DEFAULT_DASHBOARD_WIDGET_ORDER`.

- [ ] **Step 3: Add the shared dashboard types and dnd dependencies**

```ts
// apps/web/src/types/dashboard.ts
export const DASHBOARD_WIDGET_IDS = [
	"review-requests",
	"my-pull-requests",
	"my-issues",
	"activity-feed",
	"trending-repositories",
	"saved-searches",
] as const;

export type DashboardWidgetId = (typeof DASHBOARD_WIDGET_IDS)[number];

export const DEFAULT_DASHBOARD_WIDGET_ORDER: DashboardWidgetId[] = [
	"review-requests",
	"my-pull-requests",
	"my-issues",
	"activity-feed",
	"trending-repositories",
	"saved-searches",
];

export type ActivityEventType =
	| "push"
	| "pull_request"
	| "issue"
	| "review"
	| "comment"
	| "release"
	| "fork"
	| "star";

export type ActivityRangePreset = "today" | "7d" | "30d" | "custom";

export interface ActivityFilters {
	eventTypes: ActivityEventType[];
	repo: string;
	range: ActivityRangePreset;
	from: string;
	to: string;
}

export interface SavedSearchRecord {
	id: string;
	label: string;
	query: string;
	scope: "issues" | "prs" | "repos" | "users";
	lastUsedAt: string;
	syncPending: boolean;
}
```

```json
// apps/web/package.json
{
	"dependencies": {
		"@dnd-kit/core": "^6.3.1",
		"@dnd-kit/sortable": "^10.0.0"
	}
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/hooks/use-dashboard-layout.test.ts`

Expected: PASS with one passing assertion for the default order constant.

- [ ] **Step 5: Commit**

```bash
git add apps/web/package.json apps/web/src/types/dashboard.ts apps/web/src/hooks/use-dashboard-layout.test.ts
git commit -m "feat: add dashboard shared types"
```

## Task 2: Implement `useDashboardLayout`

**Files:**
- Create: `apps/web/src/hooks/use-dashboard-layout.ts`
- Modify: `apps/web/src/hooks/use-dashboard-layout.test.ts`
- Test: `apps/web/src/hooks/use-dashboard-layout.test.ts`

- [ ] **Step 1: Write the failing hook tests**

```ts
import { renderHook, act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { useDashboardLayout } from "./use-dashboard-layout";

describe("useDashboardLayout", () => {
	beforeEach(() => localStorage.clear());

	it("uses the default widget order on first load", () => {
		const { result } = renderHook(() => useDashboardLayout());
		expect(result.current.widgetOrder).toEqual([
			"review-requests",
			"my-pull-requests",
			"my-issues",
			"activity-feed",
			"trending-repositories",
			"saved-searches",
		]);
	});

	it("persists reordering and resets cleanly", () => {
		const { result } = renderHook(() => useDashboardLayout());

		act(() => {
			result.current.moveWidget("saved-searches", "review-requests");
		});

		expect(localStorage.getItem("dashboard_widget_order")).toContain("saved-searches");

		act(() => {
			result.current.resetLayout();
		});

		expect(localStorage.getItem("dashboard_widget_order")).toBeNull();
		expect(result.current.widgetOrder[0]).toBe("review-requests");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/hooks/use-dashboard-layout.test.ts`

Expected: FAIL because `useDashboardLayout` does not exist yet.

- [ ] **Step 3: Write the minimal hook implementation**

```ts
// apps/web/src/hooks/use-dashboard-layout.ts
"use client";

import { useEffect, useState } from "react";
import { arrayMove } from "@dnd-kit/sortable";
import {
	DASHBOARD_WIDGET_IDS,
	DEFAULT_DASHBOARD_WIDGET_ORDER,
	type DashboardWidgetId,
} from "@/types/dashboard";

const STORAGE_KEY = "dashboard_widget_order";

function sanitizeOrder(value: unknown): DashboardWidgetId[] {
	if (!Array.isArray(value)) return DEFAULT_DASHBOARD_WIDGET_ORDER;
	const known = new Set(DASHBOARD_WIDGET_IDS);
	const next = value.filter((item): item is DashboardWidgetId => known.has(item as DashboardWidgetId));
	const missing = DEFAULT_DASHBOARD_WIDGET_ORDER.filter((item) => !next.includes(item));
	return next.length > 0 ? [...next, ...missing] : DEFAULT_DASHBOARD_WIDGET_ORDER;
}

export function useDashboardLayout() {
	const [widgetOrder, setWidgetOrder] = useState<DashboardWidgetId[]>(DEFAULT_DASHBOARD_WIDGET_ORDER);

	useEffect(() => {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return;
		try {
			setWidgetOrder(sanitizeOrder(JSON.parse(raw)));
		} catch {
			setWidgetOrder(DEFAULT_DASHBOARD_WIDGET_ORDER);
		}
	}, []);

	const persist = (next: DashboardWidgetId[]) => {
		setWidgetOrder(next);
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	};

	return {
		widgetOrder,
		moveWidget(activeId: DashboardWidgetId, overId: DashboardWidgetId) {
			if (activeId === overId) return;
			const oldIndex = widgetOrder.indexOf(activeId);
			const newIndex = widgetOrder.indexOf(overId);
			persist(arrayMove(widgetOrder, oldIndex, newIndex));
		},
		resetLayout() {
			localStorage.removeItem(STORAGE_KEY);
			setWidgetOrder(DEFAULT_DASHBOARD_WIDGET_ORDER);
		},
	};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/hooks/use-dashboard-layout.test.ts`

Expected: PASS with both hook behaviors covered.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-dashboard-layout.ts apps/web/src/hooks/use-dashboard-layout.test.ts
git commit -m "feat: add dashboard layout hook"
```

## Task 3: Build Sortable Widget Shells and Wire the Personal Layout

**Files:**
- Create: `apps/web/src/components/dashboard/widget-error-boundary.tsx`
- Create: `apps/web/src/components/dashboard/draggable-widget.tsx`
- Create: `apps/web/src/components/dashboard/dashboard-layout.tsx`
- Create: `apps/web/src/components/dashboard/dashboard-layout.test.tsx`
- Modify: `apps/web/src/components/dashboard/dashboard-content.tsx`
- Test: `apps/web/src/components/dashboard/dashboard-layout.test.tsx`

- [ ] **Step 1: Write the failing integration test for rendered widget order**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DashboardLayout } from "./dashboard-layout";

describe("DashboardLayout", () => {
	it("renders widgets in the provided order", () => {
		render(
			<DashboardLayout
				widgets={[
					{ id: "saved-searches", title: "Saved Searches", content: <div>saved</div> },
					{ id: "review-requests", title: "Review Requests", content: <div>reviews</div> },
				]}
			/>,
		);

		expect(screen.getAllByRole("region").map((node) => node.getAttribute("aria-label"))).toEqual([
			"Saved Searches",
			"Review Requests",
		]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/components/dashboard/dashboard-layout.test.tsx`

Expected: FAIL because `DashboardLayout` does not exist yet.

- [ ] **Step 3: Write the widget shell components and wire them into the dashboard**

```tsx
// apps/web/src/components/dashboard/draggable-widget.tsx
"use client";

import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import type { DashboardWidgetId } from "@/types/dashboard";

export function DraggableWidget({
	id,
	title,
	children,
}: {
	id: DashboardWidgetId;
	title: string;
	children: React.ReactNode;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
		useSortable({ id });

	return (
		<section
			ref={setNodeRef}
			aria-label={title}
			style={{ transform: CSS.Transform.toString(transform), transition }}
			className={cn(
				"rounded-lg border border-border bg-background",
				isDragging && "opacity-70",
				isOver && "border-dashed",
			)}
		>
			<div className="flex items-center justify-between border-b border-border px-3 py-2">
				<h2 className="text-sm font-medium">{title}</h2>
				<button
					type="button"
					aria-label={`Reorder ${title}`}
					className="inline-flex h-8 w-8 items-center justify-center rounded-md"
					{...attributes}
					{...listeners}
				>
					<GripVertical className="h-4 w-4" />
				</button>
			</div>
			<div>{children}</div>
		</section>
	);
}
```

```tsx
// apps/web/src/components/dashboard/dashboard-layout.tsx
"use client";

import { closestCenter, DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import type { DashboardWidgetId } from "@/types/dashboard";
import { DraggableWidget } from "./draggable-widget";

export interface DashboardWidgetDefinition {
	id: DashboardWidgetId;
	title: string;
	content: React.ReactNode;
}

export function DashboardLayout({ widgets }: { widgets: DashboardWidgetDefinition[] }) {
	const { widgetOrder, moveWidget, resetLayout } = useDashboardLayout();
	const sensors = useSensors(
		useSensor(PointerSensor),
		useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
	);

	const ordered = widgetOrder
		.map((id) => widgets.find((widget) => widget.id === id))
		.filter((widget): widget is DashboardWidgetDefinition => Boolean(widget));

	return (
		<div className="flex flex-col gap-3">
			<div className="flex justify-end">
				<button type="button" className="text-sm underline underline-offset-4" onClick={resetLayout}>
					Reset layout
				</button>
			</div>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={({ active, over }) => {
					if (!over) return;
					moveWidget(active.id as DashboardWidgetId, over.id as DashboardWidgetId);
				}}
			>
				<SortableContext items={ordered.map((widget) => widget.id)} strategy={verticalListSortingStrategy}>
					{ordered.map((widget) => (
						<DraggableWidget key={widget.id} id={widget.id} title={widget.title}>
							{widget.content}
						</DraggableWidget>
					))}
				</SortableContext>
			</DndContext>
		</div>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/components/dashboard/dashboard-layout.test.tsx`

Expected: PASS with widgets rendered in stable order and reset button present.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/dashboard/widget-error-boundary.tsx apps/web/src/components/dashboard/draggable-widget.tsx apps/web/src/components/dashboard/dashboard-layout.tsx apps/web/src/components/dashboard/dashboard-layout.test.tsx apps/web/src/components/dashboard/dashboard-content.tsx
git commit -m "feat: add sortable dashboard widget layout"
```

## Task 4: Add URL-Synced Activity Filters

**Files:**
- Create: `apps/web/src/hooks/use-activity-filters.ts`
- Create: `apps/web/src/hooks/use-activity-filters.test.ts`
- Create: `apps/web/src/components/dashboard/activity-filter-chip.tsx`
- Create: `apps/web/src/components/dashboard/activity-filter-bar.tsx`
- Create: `apps/web/src/components/dashboard/activity-feed.tsx`
- Modify: `apps/web/src/components/dashboard/dashboard-content.tsx`
- Test: `apps/web/src/hooks/use-activity-filters.test.ts`

- [ ] **Step 1: Write the failing filter hook tests**

```ts
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useActivityFilters } from "./use-activity-filters";

vi.mock("nuqs", () => ({
	useQueryStates: () => [
		{ activityTypes: "push,review", repo: "acme/api", range: "7d", from: "", to: "" },
		vi.fn(),
	],
	parseAsString: { withDefault: () => ({}) },
}));

describe("useActivityFilters", () => {
	it("normalizes comma-separated activity types", () => {
		const { result } = renderHook(() => useActivityFilters());
		expect(result.current.filters.eventTypes).toEqual(["push", "review"]);
	});

	it("reports active filters when any filter is set", () => {
		const { result } = renderHook(() => useActivityFilters());
		expect(result.current.hasActiveFilters).toBe(true);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/hooks/use-activity-filters.test.ts`

Expected: FAIL because `useActivityFilters` does not exist yet.

- [ ] **Step 3: Implement the hook and filter UI**

```ts
// apps/web/src/hooks/use-activity-filters.ts
"use client";

import { parseAsString, useQueryStates } from "nuqs";
import type { ActivityEventType, ActivityFilters } from "@/types/dashboard";

const EMPTY_FILTERS: ActivityFilters = {
	eventTypes: [],
	repo: "",
	range: "7d",
	from: "",
	to: "",
};

export function useActivityFilters() {
	const [state, setState] = useQueryStates({
		activityTypes: parseAsString.withDefault(""),
		repo: parseAsString.withDefault(""),
		range: parseAsString.withDefault("7d"),
		from: parseAsString.withDefault(""),
		to: parseAsString.withDefault(""),
	});

	const filters: ActivityFilters = {
		eventTypes: state.activityTypes
			.split(",")
			.map((value) => value.trim())
			.filter(Boolean) as ActivityEventType[],
		repo: state.repo,
		range: state.range as ActivityFilters["range"],
		from: state.from,
		to: state.to,
	};

	return {
		filters,
		hasActiveFilters: Boolean(filters.eventTypes.length || filters.repo || filters.from || filters.to),
		setEventTypes(eventTypes: ActivityEventType[]) {
			setState({ activityTypes: eventTypes.join(",") || null });
		},
		setRepo(repo: string) {
			setState({ repo: repo || null });
		},
		setRange(range: ActivityFilters["range"], from = "", to = "") {
			setState({ range, from: from || null, to: to || null });
		},
		clearAll() {
			setState({
				activityTypes: null,
				repo: null,
				range: EMPTY_FILTERS.range,
				from: null,
				to: null,
			});
		},
	};
}
```

```tsx
// apps/web/src/components/dashboard/activity-feed.tsx
"use client";

import { useMemo } from "react";
import type { ActivityEvent } from "@/lib/github-types";
import { useActivityFilters } from "@/hooks/use-activity-filters";
import { ActivityFilterBar } from "./activity-filter-bar";

export function ActivityFeed({ activity }: { activity: ActivityEvent[] }) {
	const { filters, hasActiveFilters, clearAll } = useActivityFilters();

	const filteredActivity = useMemo(() => {
		return activity.filter((item) => {
			if (filters.repo && item.repo?.name !== filters.repo) return false;
			if (filters.eventTypes.length > 0 && !filters.eventTypes.includes(item.type as never)) return false;
			return true;
		});
	}, [activity, filters]);

	return (
		<div className="space-y-3">
			<ActivityFilterBar hasActiveFilters={hasActiveFilters} onClearAll={clearAll} />
			{filteredActivity.length === 0 ? (
				<div className="rounded-md border border-border p-4 text-sm text-muted-foreground">
					No activity matched the current filters.
				</div>
			) : (
				filteredActivity.map((event) => <div key={event.id ?? `${event.type}-${event.created_at}`}>{event.type}</div>)
			)}
		</div>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/hooks/use-activity-filters.test.ts`

Expected: PASS with normalized state and active-filter behavior covered.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-activity-filters.ts apps/web/src/hooks/use-activity-filters.test.ts apps/web/src/components/dashboard/activity-filter-chip.tsx apps/web/src/components/dashboard/activity-filter-bar.tsx apps/web/src/components/dashboard/activity-feed.tsx apps/web/src/components/dashboard/dashboard-content.tsx
git commit -m "feat: add dashboard activity filters"
```

## Task 5: Introduce Shared Quick-Action Infrastructure

**Files:**
- Create: `apps/web/src/hooks/use-quick-action.ts`
- Create: `apps/web/src/hooks/use-quick-action.test.ts`
- Create: `apps/web/src/components/dashboard/cards/quick-action-bar.tsx`
- Create: `apps/web/src/components/dashboard/cards/inline-comment-composer.tsx`
- Test: `apps/web/src/hooks/use-quick-action.test.ts`

- [ ] **Step 1: Write the failing optimistic update test**

```ts
import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { createQuickActionMutation } from "./use-quick-action";

describe("useQuickAction helpers", () => {
	it("rolls back the cache when the action fails", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(["dashboard", "issues"], [{ id: 1, state: "open" }]);

		const mutation = createQuickActionMutation({
			queryClient,
			queryKey: ["dashboard", "issues"],
			mutationFn: vi.fn().mockRejectedValue(new Error("boom")),
			applyOptimisticUpdate: () => [{ id: 1, state: "closed" }],
		});

		await expect(mutation({ id: 1 })).rejects.toThrow("boom");
		expect(queryClient.getQueryData(["dashboard", "issues"])).toEqual([{ id: 1, state: "open" }]);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/hooks/use-quick-action.test.ts`

Expected: FAIL because `createQuickActionMutation` does not exist yet.

- [ ] **Step 3: Implement the shared mutation helper and action-row UI**

```ts
// apps/web/src/hooks/use-quick-action.ts
"use client";

import { useQueryClient } from "@tanstack/react-query";

export function createQuickActionMutation<TVariables, TData>({
	queryClient,
	queryKey,
	mutationFn,
	applyOptimisticUpdate,
}: {
	queryClient: ReturnType<typeof useQueryClient>;
	queryKey: readonly unknown[];
	mutationFn: (variables: TVariables) => Promise<TData>;
	applyOptimisticUpdate: (current: unknown, variables: TVariables) => unknown;
}) {
	return async (variables: TVariables) => {
		const previous = queryClient.getQueryData(queryKey);
		queryClient.setQueryData(queryKey, (current: unknown) => applyOptimisticUpdate(current, variables));

		try {
			return await mutationFn(variables);
		} catch (error) {
			queryClient.setQueryData(queryKey, previous);
			throw error;
		} finally {
			await queryClient.invalidateQueries({ queryKey });
		}
	};
}
```

```tsx
// apps/web/src/components/dashboard/cards/quick-action-bar.tsx
"use client";

import { cn } from "@/lib/utils";

export function QuickActionBar({
	children,
	className,
}: {
	children: React.ReactNode;
	className?: string;
}) {
	return (
		<div
			className={cn(
				"flex flex-wrap items-center gap-2 border-t border-border px-3 py-2 md:opacity-0 md:transition-opacity md:group-hover:opacity-100",
				className,
			)}
		>
			{children}
		</div>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/hooks/use-quick-action.test.ts`

Expected: PASS with rollback behavior covered.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-quick-action.ts apps/web/src/hooks/use-quick-action.test.ts apps/web/src/components/dashboard/cards/quick-action-bar.tsx apps/web/src/components/dashboard/cards/inline-comment-composer.tsx
git commit -m "feat: add dashboard quick action infrastructure"
```

## Task 6: Refactor Personal Dashboard Cards to Use Quick Actions

**Files:**
- Create: `apps/web/src/components/dashboard/cards/review-request-card.tsx`
- Create: `apps/web/src/components/dashboard/cards/pull-request-card.tsx`
- Create: `apps/web/src/components/dashboard/cards/issue-card.tsx`
- Modify: `apps/web/src/components/dashboard/dashboard-content.tsx`
- Test: `apps/web/src/hooks/use-quick-action.test.ts`

- [ ] **Step 1: Write the failing card interaction test**

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PullRequestCard } from "./pull-request-card";

describe("PullRequestCard", () => {
	it("disables merge when the PR is not mergeable", () => {
		render(
			<PullRequestCard
				pullRequest={{ id: 1, title: "Fix", mergeable: false, mergeableReason: "Conflicts" } as never}
			/>,
		);

		expect(screen.getByRole("button", { name: "Merge" })).toBeDisabled();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/hooks/use-quick-action.test.ts`

Expected: FAIL because the card files do not exist and no merge-disable behavior is implemented.

- [ ] **Step 3: Create card components and replace the inlined dashboard card markup**

```tsx
// apps/web/src/components/dashboard/cards/pull-request-card.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { QuickActionBar } from "./quick-action-bar";

export function PullRequestCard({
	pullRequest,
	onView,
	onMerge,
	onClose,
}: {
	pullRequest: { title: string; mergeable: boolean; mergeableReason?: string };
	onView: () => void;
	onMerge: () => void;
	onClose: () => void;
}) {
	return (
		<div className="group rounded-lg border border-border">
			<div className="px-3 py-3">{pullRequest.title}</div>
			<QuickActionBar>
				<Button size="sm" variant="outline" onClick={onView}>
					View PR
				</Button>
				<Tooltip>
					<TooltipTrigger asChild>
						<span>
							<Button size="sm" onClick={onMerge} disabled={!pullRequest.mergeable}>
								Merge
							</Button>
						</span>
					</TooltipTrigger>
					{!pullRequest.mergeable ? (
						<TooltipContent>{pullRequest.mergeableReason ?? "This PR cannot be merged yet."}</TooltipContent>
					) : null}
				</Tooltip>
				<Button size="sm" variant="outline" onClick={onClose}>
					Close PR
				</Button>
			</QuickActionBar>
		</div>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/hooks/use-quick-action.test.ts`

Expected: PASS with merge-disabled coverage and no regression in the shared quick-action helper.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/dashboard/cards/review-request-card.tsx apps/web/src/components/dashboard/cards/pull-request-card.tsx apps/web/src/components/dashboard/cards/issue-card.tsx apps/web/src/components/dashboard/dashboard-content.tsx
git commit -m "feat: add dashboard card quick actions"
```

## Task 7: Build Saved Searches End to End

**Files:**
- Create: `apps/web/src/hooks/use-saved-searches.ts`
- Create: `apps/web/src/hooks/use-saved-searches.test.ts`
- Create: `apps/web/src/components/dashboard/saved-searches-widget.tsx`
- Create: `apps/web/src/components/dashboard/saved-search-item.tsx`
- Create: `apps/web/src/components/search/save-search-button.tsx`
- Create: `apps/web/src/components/dashboard/saved-searches-widget.test.tsx`
- Modify: `apps/web/src/components/search/search-content.tsx`
- Modify: `apps/web/src/components/dashboard/dashboard-content.tsx`
- Test: `apps/web/src/hooks/use-saved-searches.test.ts`
- Test: `apps/web/src/components/dashboard/saved-searches-widget.test.tsx`

- [ ] **Step 1: Write the failing CRUD and fallback tests**

```ts
import { renderHook, act } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useSavedSearches } from "./use-saved-searches";

describe("useSavedSearches", () => {
	it("falls back to localStorage when create fails", async () => {
		global.fetch = vi.fn().mockResolvedValue({ ok: false, status: 503 }) as never;
		const { result } = renderHook(() => useSavedSearches());

		await act(async () => {
			await result.current.createSavedSearch({
				label: "My PR triage",
				query: "is:pr is:open author:@me",
				scope: "prs",
			});
		});

		expect(result.current.savedSearches[0]?.syncPending).toBe(true);
		expect(result.current.limitReached).toBe(false);
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/hooks/use-saved-searches.test.ts apps/web/src/components/dashboard/saved-searches-widget.test.tsx`

Expected: FAIL because the hook and widget files do not exist yet.

- [ ] **Step 3: Implement the saved-search hook, widget, and search-page trigger**

```ts
// apps/web/src/hooks/use-saved-searches.ts
"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SavedSearchRecord } from "@/types/dashboard";

const STORAGE_KEY = "dashboard_saved_searches_fallback";
const QUERY_KEY = ["saved-searches"];

export function useSavedSearches() {
	const queryClient = useQueryClient();
	const query = useQuery<SavedSearchRecord[]>({
		queryKey: QUERY_KEY,
		queryFn: async () => {
			const response = await fetch("/api/user/saved-searches");
			if (!response.ok) throw new Error("saved-searches-unavailable");
			return response.json();
		},
		initialData: [],
	});

	return {
		savedSearches: query.data,
		limitReached: query.data.length >= 20,
		canSave: query.data.length < 20,
		async createSavedSearch(input: Pick<SavedSearchRecord, "label" | "query" | "scope">) {
			try {
				const response = await fetch("/api/user/saved-searches", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(input),
				});
				if (!response.ok) throw new Error("create-failed");
				await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
			} catch {
				const fallback: SavedSearchRecord = {
					id: crypto.randomUUID(),
					lastUsedAt: new Date().toISOString(),
					syncPending: true,
					...input,
				};
				localStorage.setItem(STORAGE_KEY, JSON.stringify([fallback]));
				queryClient.setQueryData<SavedSearchRecord[]>(QUERY_KEY, (current = []) => [fallback, ...current]);
			}
		},
	};
}
```

```tsx
// apps/web/src/components/search/save-search-button.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useSavedSearches } from "@/hooks/use-saved-searches";

export function SaveSearchButton({
	label,
	query,
	scope,
}: {
	label: string;
	query: string;
	scope: "issues" | "prs" | "repos" | "users";
}) {
	const { canSave, createSavedSearch, limitReached } = useSavedSearches();

	return (
		<Button
			type="button"
			variant="outline"
			disabled={!canSave}
			aria-disabled={!canSave}
			onClick={() => createSavedSearch({ label, query, scope })}
		>
			Save this search
			{limitReached ? " (limit reached)" : ""}
		</Button>
	);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/hooks/use-saved-searches.test.ts apps/web/src/components/dashboard/saved-searches-widget.test.tsx`

Expected: PASS with fallback behavior, limit handling, and widget rendering covered.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-saved-searches.ts apps/web/src/hooks/use-saved-searches.test.ts apps/web/src/components/dashboard/saved-searches-widget.tsx apps/web/src/components/dashboard/saved-search-item.tsx apps/web/src/components/dashboard/saved-searches-widget.test.tsx apps/web/src/components/search/save-search-button.tsx apps/web/src/components/search/search-content.tsx apps/web/src/components/dashboard/dashboard-content.tsx
git commit -m "feat: add saved searches to dashboard and search"
```

## Task 8: Add Team Dashboard Data Hook and Team Components

**Files:**
- Create: `apps/web/src/hooks/use-team-dashboard.ts`
- Create: `apps/web/src/hooks/use-team-dashboard.test.ts`
- Create: `apps/web/src/components/dashboard/team-dashboard.tsx`
- Create: `apps/web/src/components/dashboard/team-activity-feed.tsx`
- Create: `apps/web/src/components/dashboard/team-metrics-bar.tsx`
- Create: `apps/web/src/components/dashboard/open-prs-panel.tsx`
- Create: `apps/web/src/components/dashboard/top-contributors.tsx`
- Create: `apps/web/src/components/dashboard/team-selector.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/page.tsx`
- Modify: `apps/web/src/components/dashboard/dashboard-content.tsx`
- Modify: `apps/web/src/app/(app)/dashboard/page.test.ts`
- Test: `apps/web/src/hooks/use-team-dashboard.test.ts`

- [ ] **Step 1: Write the failing team hook tests**

```ts
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useTeamDashboard } from "./use-team-dashboard";

vi.mock("@tanstack/react-query", async () => {
	const actual = await vi.importActual("@tanstack/react-query");
	return {
		...actual,
		useQueries: () => [
			{ data: [{ login: "acme" }] },
			{ data: { openedPrs: 4, mergedPrs: 2 } },
		],
	};
});

describe("useTeamDashboard", () => {
	it("hydrates the selected org from localStorage", () => {
		localStorage.setItem("dashboard_team_selection", JSON.stringify({ org: "acme", team: "" }));
		const { result } = renderHook(() => useTeamDashboard());
		expect(result.current.selection.org).toBe("acme");
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/hooks/use-team-dashboard.test.ts`

Expected: FAIL because `useTeamDashboard` does not exist yet.

- [ ] **Step 3: Implement the team hook and team widgets**

```ts
// apps/web/src/hooks/use-team-dashboard.ts
"use client";

import { useEffect, useState } from "react";
import { useQueries } from "@tanstack/react-query";

const STORAGE_KEY = "dashboard_team_selection";

export function useTeamDashboard() {
	const [selection, setSelection] = useState({ org: "", team: "" });

	useEffect(() => {
		const raw = localStorage.getItem(STORAGE_KEY);
		if (!raw) return;
		try {
			setSelection(JSON.parse(raw));
		} catch {}
	}, []);

	const [orgsQuery, metricsQuery, activityQuery, openPrsQuery, contributorsQuery] = useQueries({
		queries: [
			{ queryKey: ["team", "orgs"], queryFn: async () => fetch("/api/orgs").then((r) => r.json()) },
			{ queryKey: ["team", "metrics", selection], queryFn: async () => fetch(`/api/orgs/${selection.org}/stats`).then((r) => r.json()), enabled: Boolean(selection.org) },
			{ queryKey: ["team", "activity", selection], queryFn: async () => fetch(`/api/orgs/${selection.org}/activity`).then((r) => r.json()), enabled: Boolean(selection.org) },
			{ queryKey: ["team", "open-prs", selection], queryFn: async () => fetch(`/api/orgs/${selection.org}/pulls`).then((r) => r.json()), enabled: Boolean(selection.org) },
			{ queryKey: ["team", "contributors", selection], queryFn: async () => fetch(`/api/orgs/${selection.org}/contributors`).then((r) => r.json()), enabled: Boolean(selection.org) },
		],
	});

	return {
		selection,
		setSelection(next: { org: string; team: string }) {
			setSelection(next);
			localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
		},
		orgs: orgsQuery.data ?? [],
		metrics: metricsQuery.data,
		activity: activityQuery.data ?? [],
		openPrs: openPrsQuery.data ?? [],
		contributors: contributorsQuery.data ?? [],
		isLoading:
			orgsQuery.isLoading ||
			metricsQuery.isLoading ||
			activityQuery.isLoading ||
			openPrsQuery.isLoading ||
			contributorsQuery.isLoading,
	};
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `bun test apps/web/src/hooks/use-team-dashboard.test.ts apps/web/src/app/(app)/dashboard/page.test.ts`

Expected: PASS with org-selection persistence covered and the dashboard page test updated to support Team mode inputs.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/hooks/use-team-dashboard.ts apps/web/src/hooks/use-team-dashboard.test.ts apps/web/src/components/dashboard/team-dashboard.tsx apps/web/src/components/dashboard/team-activity-feed.tsx apps/web/src/components/dashboard/team-metrics-bar.tsx apps/web/src/components/dashboard/open-prs-panel.tsx apps/web/src/components/dashboard/top-contributors.tsx apps/web/src/components/dashboard/team-selector.tsx apps/web/src/app/(app)/dashboard/page.tsx apps/web/src/components/dashboard/dashboard-content.tsx apps/web/src/app/(app)/dashboard/page.test.ts
git commit -m "feat: add team dashboard mode"
```

## Task 9: Final Wiring, Accessibility Pass, and Regression Tests

**Files:**
- Modify: `apps/web/src/components/dashboard/dashboard-content.tsx`
- Modify: `apps/web/src/components/search/search-content.tsx`
- Modify: `apps/web/src/components/dashboard/dashboard-layout.tsx`
- Modify: `apps/web/src/components/dashboard/draggable-widget.tsx`
- Modify: `apps/web/src/components/dashboard/saved-searches-widget.tsx`
- Test: `apps/web/src/components/dashboard/dashboard-layout.test.tsx`
- Test: `apps/web/src/components/dashboard/saved-searches-widget.test.tsx`

- [ ] **Step 1: Write the failing regression tests for reset layout and saved-search rename/delete**

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SavedSearchesWidget } from "./saved-searches-widget";

describe("SavedSearchesWidget", () => {
	it("supports inline rename and delete confirmation", async () => {
		const user = userEvent.setup();
		render(
			<SavedSearchesWidget
				items={[
					{
						id: "1",
						label: "PR triage",
						query: "is:pr is:open",
						scope: "prs",
						lastUsedAt: "2026-03-29T00:00:00.000Z",
						syncPending: false,
					},
				]}
			/>,
		);

		await user.click(screen.getByRole("button", { name: "Rename PR triage" }));
		expect(screen.getByDisplayValue("PR triage")).toBeInTheDocument();
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun test apps/web/src/components/dashboard/dashboard-layout.test.tsx apps/web/src/components/dashboard/saved-searches-widget.test.tsx`

Expected: FAIL until the rename/delete and accessibility behavior are finished.

- [ ] **Step 3: Finish the wiring and accessibility details**

```tsx
// apps/web/src/components/dashboard/dashboard-content.tsx
const [view, setView] = useQueryState(
	"view",
	parseAsStringLiteral(["personal", "team"] as const).withDefault("personal"),
);

// render header toggle
<div className="flex items-center gap-2">
	<Button
		type="button"
		variant={view === "personal" ? "default" : "outline"}
		onClick={() => setView("personal")}
	>
		Personal
	</Button>
	{hasOrganizations ? (
		<Button
			type="button"
			variant={view === "team" ? "default" : "outline"}
			onClick={() => setView("team")}
		>
			Team
		</Button>
	) : null}
</div>
```

```tsx
// apps/web/src/components/dashboard/draggable-widget.tsx
<button
	type="button"
	aria-label={`Reorder ${title}`}
	aria-describedby={`${id}-description`}
	className="inline-flex h-8 w-8 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2"
	{...attributes}
	{...listeners}
>
	<GripVertical className="h-4 w-4" />
</button>
```

- [ ] **Step 4: Run the full targeted dashboard test suite**

Run: `bun test apps/web/src/hooks/use-dashboard-layout.test.ts apps/web/src/hooks/use-activity-filters.test.ts apps/web/src/hooks/use-quick-action.test.ts apps/web/src/hooks/use-saved-searches.test.ts apps/web/src/hooks/use-team-dashboard.test.ts apps/web/src/components/dashboard/dashboard-layout.test.tsx apps/web/src/components/dashboard/saved-searches-widget.test.tsx apps/web/src/app/(app)/dashboard/page.test.ts`

Expected: PASS with all new hooks and integration flows covered.

- [ ] **Step 5: Run repo checks and commit**

Run: `bun check`

Expected: PASS for lint, format, and TypeScript validation.

```bash
git add apps/web/src/components/dashboard/dashboard-content.tsx apps/web/src/components/search/search-content.tsx apps/web/src/components/dashboard/dashboard-layout.tsx apps/web/src/components/dashboard/draggable-widget.tsx apps/web/src/components/dashboard/saved-searches-widget.tsx apps/web/src/components/dashboard/dashboard-layout.test.tsx apps/web/src/components/dashboard/saved-searches-widget.test.tsx
git commit -m "feat: finish dashboard improvements"
```

## Self-Review

### Spec Coverage

- Feature 1 is covered by Tasks 1 to 3.
- Feature 2 is covered by Task 4.
- Feature 3 is covered by Tasks 5 and 6.
- Feature 4 is covered by Task 7 and the final regression task.
- Feature 5 is covered by Task 8 and the final regression task.
- Error boundaries, accessibility, and tests are explicitly covered by Tasks 3 and 9.

### Placeholder Scan

- No `TODO`, `TBD`, or deferred implementation markers remain.
- Each task names exact files, commands, and expected outputs.

### Type Consistency

- Widget IDs are centralized in `types/dashboard.ts`.
- Activity filter shape is defined once and reused.
- Saved search shape is defined once and reused.
- Team selection storage key and widget-order storage key stay constant across tasks.
