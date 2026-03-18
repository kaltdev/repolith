import { describe, expect, it } from "vitest";
import { parseSuggestionBlock } from "./suggestion-parser";

describe("parseSuggestionBlock", () => {
	it("extracts content around a suggestion block", () => {
		expect(
			parseSuggestionBlock(
				[
					"Please tighten this.",
					"",
					"```suggestion",
					"const value = nextValue;",
					"```",
					"",
					"That should handle the null case.",
				].join("\n"),
			),
		).toEqual({
			before: "Please tighten this.",
			suggestion: "const value = nextValue;",
			after: "That should handle the null case.",
		});
	});

	it("returns null when the comment does not contain a suggestion", () => {
		expect(parseSuggestionBlock("Just a normal review comment.")).toBeNull();
	});

	it("trims the trailing newline inside the suggestion block only", () => {
		expect(parseSuggestionBlock("```suggestion\nline one\nline two\n```")).toEqual({
			before: "",
			suggestion: "line one\nline two",
			after: "",
		});
	});
});
