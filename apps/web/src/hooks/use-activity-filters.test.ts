// Verifies activity filter parsing, chip generation, and event filtering without DOM helpers.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ActivityEvent } from "@/lib/github-types";
import {
	filterActivityEvents,
	getActivityFilterChips,
	parseActivityEventTypes,
	parseActivityFilters,
	serializeActivityEventTypes,
} from "./use-activity-filters";

const sampleActivity: ActivityEvent[] = [
	{
		id: "1",
		type: "PushEvent",
		repo: { name: "acme/api" },
		created_at: "2026-03-29T10:00:00Z",
		payload: {},
	},
	{
		id: "2",
		type: "IssuesEvent",
		repo: { name: "acme/web" },
		created_at: "2026-03-20T10:00:00Z",
		payload: {
			issue: { number: 4, title: "Bug" },
		},
	},
	{
		id: "3",
		type: "WatchEvent",
		repo: { name: "acme/api" },
		created_at: "2026-03-29T08:00:00Z",
		payload: {},
	},
];

describe("activity filter helpers", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-03-29T12:00:00Z"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("parses comma separated event types and removes duplicates", () => {
		expect(parseActivityEventTypes("push,review,push,unknown")).toEqual([
			"push",
			"review",
		]);
		expect(serializeActivityEventTypes(["review", "push", "review"])).toBe(
			"review,push",
		);
	});

	it("normalizes query state into typed filters", () => {
		expect(
			parseActivityFilters({
				eventTypes: "push,review",
				repo: " acme/api ",
				range: "custom",
				from: "2026-03-01",
				to: "2026-03-29",
			}),
		).toEqual({
			eventTypes: ["push", "review"],
			repo: "acme/api",
			range: "custom",
			from: "2026-03-01",
			to: "2026-03-29",
		});
	});

	it("filters activity by repo, type, and date range", () => {
		expect(
			filterActivityEvents(sampleActivity, {
				eventTypes: ["push", "star"],
				repo: "acme/api",
				range: "today",
				from: "",
				to: "",
			}).map((event) => event.id),
		).toEqual(["1", "3"]);

		expect(
			filterActivityEvents(sampleActivity, {
				eventTypes: ["issue"],
				repo: "",
				range: "30d",
				from: "",
				to: "",
			}).map((event) => event.id),
		).toEqual(["2"]);
	});

	it("builds dismissible chips for active filters", () => {
		expect(
			getActivityFilterChips({
				eventTypes: ["push", "review"],
				repo: "acme/api",
				range: "custom",
				from: "2026-03-01",
				to: "2026-03-29",
			}),
		).toEqual([
			{ kind: "event_type", value: "push", label: "Push" },
			{ kind: "event_type", value: "review", label: "Review" },
			{ kind: "repo", value: "acme/api", label: "acme/api" },
			{
				kind: "range",
				value: "custom",
				label: "Custom range: Mar 1 - Mar 29",
			},
		]);
	});
});
