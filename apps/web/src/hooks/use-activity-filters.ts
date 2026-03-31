"use client";

// Owns the URL-synced activity filter state and pure helpers for filtering dashboard activity.

import { useMemo } from "react";
import { parseAsString, parseAsStringLiteral, useQueryState } from "nuqs";
import type { ActivityEvent } from "@/lib/github-types";
import {
	ACTIVITY_EVENT_TYPES,
	ACTIVITY_RANGE_PRESETS,
	type ActivityEventType,
	type ActivityFilters,
	type ActivityRangePreset,
} from "@/types/dashboard";

export interface ActivityFilterChipModel {
	kind: "event_type" | "repo" | "range";
	value: string;
	label: string;
}

const DEFAULT_RANGE: ActivityRangePreset = "7d";

const EVENT_TYPE_LABELS: Record<ActivityEventType, string> = {
	push: "Push",
	pull_request: "Pull request",
	issue: "Issue",
	review: "Review",
	comment: "Comment",
	release: "Release",
	fork: "Fork",
	star: "Star",
};

const RANGE_LABELS: Record<ActivityRangePreset, string> = {
	today: "Today",
	"7d": "Last 7 days",
	"30d": "Last 30 days",
	custom: "Custom range",
};

const EVENT_TYPE_SET = new Set<ActivityEventType>(ACTIVITY_EVENT_TYPES);

function normalizeDateInput(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return "";
	return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : "";
}

function formatDateLabel(value: string): string {
	const parsed = new Date(`${value}T00:00:00`);
	if (Number.isNaN(parsed.getTime())) return value;
	return new Intl.DateTimeFormat("en-US", {
		month: "short",
		day: "numeric",
	}).format(parsed);
}

export function parseActivityEventTypes(value: string): ActivityEventType[] {
	if (!value.trim()) return [];

	const seen = new Set<ActivityEventType>();
	const next: ActivityEventType[] = [];
	for (const part of value.split(",")) {
		const normalized = part.trim();
		if (!normalized || !EVENT_TYPE_SET.has(normalized as ActivityEventType)) continue;
		const eventType = normalized as ActivityEventType;
		if (seen.has(eventType)) continue;
		seen.add(eventType);
		next.push(eventType);
	}

	return next;
}

export function serializeActivityEventTypes(eventTypes: ActivityEventType[]): string {
	return [...new Set(eventTypes)].join(",");
}

export function parseActivityFilters(state: {
	eventTypes: string;
	repo: string;
	range: string;
	from: string;
	to: string;
}): ActivityFilters {
	const parsedRange = ACTIVITY_RANGE_PRESETS.includes(state.range as ActivityRangePreset)
		? (state.range as ActivityRangePreset)
		: DEFAULT_RANGE;

	return {
		eventTypes: parseActivityEventTypes(state.eventTypes),
		repo: state.repo.trim(),
		range: parsedRange,
		from: normalizeDateInput(state.from),
		to: normalizeDateInput(state.to),
	};
}

function getEventFilterType(event: ActivityEvent): ActivityEventType | null {
	switch (event.type) {
		case "PushEvent":
			return "push";
		case "PullRequestEvent":
			return "pull_request";
		case "IssuesEvent":
			return "issue";
		case "PullRequestReviewEvent":
			return "review";
		case "PullRequestReviewCommentEvent":
		case "IssueCommentEvent":
		case "CommitCommentEvent":
			return "comment";
		case "ReleaseEvent":
			return "release";
		case "ForkEvent":
			return "fork";
		case "WatchEvent":
			return "star";
		default:
			return null;
	}
}

function getLocalDate(value: string | null): Date | null {
	if (!value) return null;
	const parsed = new Date(value);
	if (Number.isNaN(parsed.getTime())) return null;
	return parsed;
}

function startOfDay(date: Date): Date {
	const next = new Date(date);
	next.setHours(0, 0, 0, 0);
	return next;
}

function isWithinDateRange(createdAt: string | null, filters: ActivityFilters): boolean {
	const parsed = getLocalDate(createdAt);
	if (!parsed) return false;

	if (filters.range === "today") {
		return parsed >= startOfDay(new Date());
	}

	if (filters.range === "7d" || filters.range === "30d") {
		const daysBack = filters.range === "7d" ? 6 : 29;
		const threshold = startOfDay(new Date());
		threshold.setDate(threshold.getDate() - daysBack);
		return parsed >= threshold;
	}

	const from = getLocalDate(filters.from ? `${filters.from}T00:00:00` : null);
	const to = getLocalDate(filters.to ? `${filters.to}T23:59:59.999` : null);

	if (from && parsed < from) return false;
	if (to && parsed > to) return false;
	return true;
}

export function filterActivityEvents(
	activity: ActivityEvent[],
	filters: ActivityFilters,
): ActivityEvent[] {
	return activity.filter((event) => {
		if (filters.repo && event.repo.name !== filters.repo) return false;
		if (filters.eventTypes.length > 0) {
			const kind = getEventFilterType(event);
			if (!kind || !filters.eventTypes.includes(kind)) return false;
		}
		if (!isWithinDateRange(event.created_at, filters)) return false;
		return true;
	});
}

export function getActivityFilterChips(filters: ActivityFilters): ActivityFilterChipModel[] {
	const chips: ActivityFilterChipModel[] = [];

	for (const eventType of filters.eventTypes) {
		chips.push({
			kind: "event_type",
			value: eventType,
			label: EVENT_TYPE_LABELS[eventType],
		});
	}

	if (filters.repo) {
		chips.push({
			kind: "repo",
			value: filters.repo,
			label: filters.repo,
		});
	}

	if (filters.range === "today" || filters.range === "30d") {
		chips.push({
			kind: "range",
			value: filters.range,
			label: RANGE_LABELS[filters.range],
		});
	} else if (filters.range === "custom" && (filters.from || filters.to)) {
		const labelParts: string[] = [];
		if (filters.from) labelParts.push(formatDateLabel(filters.from));
		if (filters.to) labelParts.push(formatDateLabel(filters.to));
		chips.push({
			kind: "range",
			value: "custom",
			label:
				labelParts.length > 0
					? `Custom range: ${labelParts.join(" - ")}`
					: RANGE_LABELS.custom,
		});
	}

	return chips;
}

export function useActivityFilters() {
	const [eventTypesParam, setEventTypesParam] = useQueryState(
		"activity_type",
		parseAsString.withDefault(""),
	);
	const [repoParam, setRepoParam] = useQueryState("repo", parseAsString.withDefault(""));
	const [rangeParam, setRangeParam] = useQueryState(
		"range",
		parseAsStringLiteral(ACTIVITY_RANGE_PRESETS).withDefault(DEFAULT_RANGE),
	);
	const [fromParam, setFromParam] = useQueryState("from", parseAsString.withDefault(""));
	const [toParam, setToParam] = useQueryState("to", parseAsString.withDefault(""));

	const filters = useMemo(
		() =>
			parseActivityFilters({
				eventTypes: eventTypesParam,
				repo: repoParam,
				range: rangeParam,
				from: fromParam,
				to: toParam,
			}),
		[eventTypesParam, fromParam, rangeParam, repoParam, toParam],
	);

	const activeChips = useMemo(() => getActivityFilterChips(filters), [filters]);

	const setEventTypes = (eventTypes: ActivityEventType[]) => {
		setEventTypesParam(
			eventTypes.length > 0 ? serializeActivityEventTypes(eventTypes) : null,
		);
	};

	const toggleEventType = (eventType: ActivityEventType) => {
		const next = filters.eventTypes.includes(eventType)
			? filters.eventTypes.filter((current) => current !== eventType)
			: [...filters.eventTypes, eventType];
		setEventTypes(next);
	};

	const setRepo = (repo: string) => {
		setRepoParam(repo.trim() ? repo.trim() : null);
	};

	const setRange = (range: ActivityRangePreset) => {
		if (range === DEFAULT_RANGE) {
			setRangeParam(null);
			setFromParam(null);
			setToParam(null);
			return;
		}

		setRangeParam(range);
		if (range !== "custom") {
			setFromParam(null);
			setToParam(null);
		}
	};

	const setCustomRange = (from: string, to: string) => {
		setRangeParam("custom");
		setFromParam(normalizeDateInput(from) || null);
		setToParam(normalizeDateInput(to) || null);
	};

	const clearChip = (chip: ActivityFilterChipModel) => {
		if (chip.kind === "event_type") {
			setEventTypes(
				filters.eventTypes.filter((eventType) => eventType !== chip.value),
			);
			return;
		}

		if (chip.kind === "repo") {
			setRepoParam(null);
			return;
		}

		setRangeParam(null);
		setFromParam(null);
		setToParam(null);
	};

	const clearAll = () => {
		setEventTypesParam(null);
		setRepoParam(null);
		setRangeParam(null);
		setFromParam(null);
		setToParam(null);
	};

	return {
		filters,
		activeChips,
		hasActiveFilters: activeChips.length > 0,
		toggleEventType,
		setRepo,
		setRange,
		setCustomRange,
		clearChip,
		clearAll,
	};
}
