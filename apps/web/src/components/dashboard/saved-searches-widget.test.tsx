// Verifies saved-search widget helpers that do not require DOM-specific test libraries.

import { describe, expect, it } from "vitest";
import { buildSavedSearchHref } from "@/hooks/use-saved-searches";

describe("SavedSearchesWidget helpers", () => {
	it("builds a navigable search URL for saved searches", () => {
		expect(buildSavedSearchHref("owner:acme is:open", "prs")).toBe(
			"/search?q=owner%3Aacme+is%3Aopen&type=prs&page=1",
		);
	});
});
