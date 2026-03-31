// Verifies dashboard widget order persistence helpers without depending on a React testing library.

import { beforeEach, describe, expect, it } from "vitest";
import {
	clearDashboardWidgetOrder,
	moveDashboardWidgetOrder,
	readDashboardWidgetOrder,
	sanitizeDashboardWidgetOrder,
	writeDashboardWidgetOrder,
} from "./use-dashboard-layout";
import { DEFAULT_DASHBOARD_WIDGET_ORDER } from "@/types/dashboard";

function createStorage() {
	const state = new Map<string, string>();

	return {
		getItem(key: string) {
			return state.has(key) ? state.get(key)! : null;
		},
		setItem(key: string, value: string) {
			state.set(key, value);
		},
		removeItem(key: string) {
			state.delete(key);
		},
	};
}

describe("dashboard layout persistence helpers", () => {
	let storage: ReturnType<typeof createStorage>;

	beforeEach(() => {
		storage = createStorage();
	});

	it("uses the default widget order when storage is empty or invalid", () => {
		expect(readDashboardWidgetOrder(storage)).toEqual(DEFAULT_DASHBOARD_WIDGET_ORDER);

		storage.setItem("dashboard_widget_order", "not-json");
		expect(readDashboardWidgetOrder(storage)).toEqual(DEFAULT_DASHBOARD_WIDGET_ORDER);
	});

	it("sanitizes stored values before they are used", () => {
		expect(
			sanitizeDashboardWidgetOrder([
				"saved-searches",
				"saved-searches",
				"unknown-widget",
				"review-requests",
			]),
		).toEqual([
			"saved-searches",
			"review-requests",
			"my-pull-requests",
			"my-issues",
			"activity-feed",
			"trending-repositories",
		]);
	});

	it("persists reordered widgets and keeps the saved value stable", () => {
		const nextOrder = moveDashboardWidgetOrder(
			DEFAULT_DASHBOARD_WIDGET_ORDER,
			"saved-searches",
			"review-requests",
		);

		writeDashboardWidgetOrder(storage, nextOrder);

		expect(readDashboardWidgetOrder(storage)).toEqual([
			"saved-searches",
			"review-requests",
			"my-pull-requests",
			"my-issues",
			"activity-feed",
			"trending-repositories",
		]);
		expect(storage.getItem("dashboard_widget_order")).toBe(JSON.stringify(nextOrder));
	});

	it("moves widgets forward without dropping the reorder", () => {
		expect(
			moveDashboardWidgetOrder(
				DEFAULT_DASHBOARD_WIDGET_ORDER,
				"review-requests",
				"my-pull-requests",
			),
		).toEqual([
			"my-pull-requests",
			"review-requests",
			"my-issues",
			"activity-feed",
			"trending-repositories",
			"saved-searches",
		]);
	});

	it("clears the saved preference on reset", () => {
		writeDashboardWidgetOrder(storage, [
			"saved-searches",
			"review-requests",
			"my-pull-requests",
			"my-issues",
			"activity-feed",
			"trending-repositories",
		]);

		clearDashboardWidgetOrder(storage);

		expect(storage.getItem("dashboard_widget_order")).toBeNull();
		expect(readDashboardWidgetOrder(storage)).toEqual(DEFAULT_DASHBOARD_WIDGET_ORDER);
	});
});
