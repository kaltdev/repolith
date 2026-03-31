// Verifies dashboard layout ordering with pure helpers instead of DOM-specific test utilities.

import { describe, expect, it } from "vitest";
import { orderDashboardWidgets, type DashboardWidgetDefinition } from "./dashboard-layout";
import { moveDashboardWidgetOrder } from "@/hooks/use-dashboard-layout";
import type { DashboardWidgetId } from "@/types/dashboard";

const widgets: DashboardWidgetDefinition[] = [
	{
		id: "review-requests",
		title: "Review Requests",
		content: null,
	},
	{
		id: "saved-searches",
		title: "Saved Searches",
		content: null,
	},
];

describe("orderDashboardWidgets", () => {
	it("returns widgets in the provided persisted order", () => {
		const order: DashboardWidgetId[] = [
			"saved-searches",
			"review-requests",
			"my-pull-requests",
			"my-issues",
			"activity-feed",
			"trending-repositories",
		];

		expect(orderDashboardWidgets(order, widgets).map((widget) => widget.id)).toEqual([
			"saved-searches",
			"review-requests",
		]);
	});

	it("preserves reordered widget order across a move flow", () => {
		const nextOrder = moveDashboardWidgetOrder(
			[
				"review-requests",
				"saved-searches",
				"my-pull-requests",
				"my-issues",
				"activity-feed",
				"trending-repositories",
			],
			"saved-searches",
			"review-requests",
		);

		expect(
			orderDashboardWidgets(nextOrder, widgets).map((widget) => widget.id),
		).toEqual(["saved-searches", "review-requests"]);
	});
});
