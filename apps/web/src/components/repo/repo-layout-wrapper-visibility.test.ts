import { describe, expect, it } from "vitest";
import { shouldRenderCompactRepoHeader } from "./repo-layout-wrapper-visibility";

describe("shouldRenderCompactRepoHeader", () => {
	it("hides the compact header until responsive state is ready", () => {
		expect(
			shouldRenderCompactRepoHeader({
				hasSummary: true,
				hasSummaryActions: true,
				isPersistentSidebar: false,
				isReady: false,
			}),
		).toBe(false);
	});

	it("hides the compact header when the sidebar is persistent", () => {
		expect(
			shouldRenderCompactRepoHeader({
				hasSummary: true,
				hasSummaryActions: true,
				isPersistentSidebar: true,
				isReady: true,
			}),
		).toBe(false);
	});

	it("shows the compact header when responsive state is ready and the sidebar is not persistent", () => {
		expect(
			shouldRenderCompactRepoHeader({
				hasSummary: true,
				hasSummaryActions: false,
				isPersistentSidebar: false,
				isReady: true,
			}),
		).toBe(true);
	});

	it("hides the compact header when there is no summary content", () => {
		expect(
			shouldRenderCompactRepoHeader({
				hasSummary: false,
				hasSummaryActions: false,
				isPersistentSidebar: false,
				isReady: true,
			}),
		).toBe(false);
	});
});
