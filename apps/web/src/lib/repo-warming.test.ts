import { describe, expect, it } from "vitest";
import {
	isValidRepoFullName,
	normalizeRepoFullNames,
	repoFullNameFromInternalUrl,
} from "./repo-warming";

describe("repo-warming", () => {
	it("extracts repo names from repo routes", () => {
		expect(repoFullNameFromInternalUrl("/vercel/next.js")).toBe("vercel/next.js");
		expect(repoFullNameFromInternalUrl("/vercel/next.js/issues/1")).toBe(
			"vercel/next.js",
		);
		expect(repoFullNameFromInternalUrl("/repos/vercel/next.js/pulls/10")).toBe(
			"vercel/next.js",
		);
	});

	it("extracts repo names from absolute urls", () => {
		expect(
			repoFullNameFromInternalUrl(
				"https://www.repolith.dev/vercel/next.js?tab=code",
			),
		).toBe("vercel/next.js");
	});

	it("rejects invalid repo names", () => {
		expect(isValidRepoFullName("vercel/next.js")).toBe(true);
		expect(isValidRepoFullName("vercel")).toBe(false);
		expect(isValidRepoFullName("vercel/next js")).toBe(false);
		expect(repoFullNameFromInternalUrl("/dashboard")).toBeNull();
	});

	it("normalizes, dedupes, and limits repo names", () => {
		expect(
			normalizeRepoFullNames(
				[
					" vercel/next.js ",
					"Vercel/next.js",
					"bad repo/name",
					"facebook/react",
					"prisma/prisma",
				],
				2,
			),
		).toEqual(["vercel/next.js", "facebook/react"]);
	});
});
