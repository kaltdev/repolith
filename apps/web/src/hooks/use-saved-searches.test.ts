// Verifies saved-search fallback parsing and URL-building helpers without DOM-only tooling.

import { describe, expect, it } from "vitest";
import {
	buildSavedSearchHref,
	normalizeSavedSearchRecord,
	readSavedSearchFallbackState,
	sortSavedSearches,
} from "./use-saved-searches";

describe("useSavedSearches helpers", () => {
	it("builds a search href from query and scope", () => {
		expect(buildSavedSearchHref("is:open label:bug", "issues")).toBe(
			"/search?q=is%3Aopen+label%3Abug&type=issues&page=1",
		);
	});

	it("normalizes API records into UI records", () => {
		expect(
			normalizeSavedSearchRecord({
				id: "1",
				label: " Bug hunt ",
				query: " is:issue ",
				scope: "issues",
				lastUsedAt: "2026-03-29T00:00:00.000Z",
			}),
		).toEqual({
			id: "1",
			label: "Bug hunt",
			query: "is:issue",
			scope: "issues",
			lastUsedAt: "2026-03-29T00:00:00.000Z",
			syncPending: false,
		});
	});

	it("reads fallback state and forces syncPending on local records", () => {
		const state = readSavedSearchFallbackState(
			JSON.stringify({
				enabled: true,
				items: [
					{
						id: "2",
						label: "PR triage",
						query: "is:pr is:open",
						scope: "prs",
						lastUsedAt: "2026-03-28T00:00:00.000Z",
						syncPending: false,
					},
				],
			}),
		);

		expect(state.enabled).toBe(true);
		expect(state.items).toEqual([
			{
				id: "2",
				label: "PR triage",
				query: "is:pr is:open",
				scope: "prs",
				lastUsedAt: "2026-03-28T00:00:00.000Z",
				syncPending: true,
			},
		]);
	});

	it("sorts records by most recent use first", () => {
		expect(
			sortSavedSearches([
				{
					id: "1",
					label: "Older",
					query: "older",
					scope: "repos",
					lastUsedAt: "2026-03-01T00:00:00.000Z",
					syncPending: false,
				},
				{
					id: "2",
					label: "Newer",
					query: "newer",
					scope: "users",
					lastUsedAt: "2026-03-29T00:00:00.000Z",
					syncPending: true,
				},
			]).map((item) => item.id),
		).toEqual(["2", "1"]);
	});
});
