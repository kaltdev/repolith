"use client";

// Owns saved-search CRUD, API fallback, and local persistence for dashboard/search surfaces.

import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { SavedSearchApiRecord, SavedSearchRecord, SavedSearchScope } from "@/types/dashboard";

export const SAVED_SEARCHES_QUERY_KEY = ["user", "saved-searches"] as const;
export const SAVED_SEARCHES_FALLBACK_STORAGE_KEY = "dashboard_saved_searches_fallback";
const SAVED_SEARCH_LIMIT = 20;

interface SavedSearchFallbackState {
	enabled: boolean;
	items: SavedSearchRecord[];
}

function isSavedSearchScope(value: string): value is SavedSearchScope {
	return ["issues", "prs", "repos", "users"].includes(value);
}

export function normalizeSavedSearchRecord(
	record: SavedSearchApiRecord | SavedSearchRecord,
): SavedSearchRecord {
	return {
		id: String(record.id),
		label: String(record.label).trim(),
		query: String(record.query).trim(),
		scope: isSavedSearchScope(record.scope) ? record.scope : "issues",
		lastUsedAt: new Date(record.lastUsedAt).toISOString(),
		syncPending: "syncPending" in record ? Boolean(record.syncPending) : false,
	};
}

export function sortSavedSearches(items: SavedSearchRecord[]): SavedSearchRecord[] {
	return [...items].sort((left, right) => {
		const leftTime = new Date(left.lastUsedAt).getTime();
		const rightTime = new Date(right.lastUsedAt).getTime();
		return rightTime - leftTime;
	});
}

export function buildSavedSearchHref(query: string, scope: SavedSearchScope): string {
	const params = new URLSearchParams({
		q: query,
		type: scope,
		page: "1",
	});
	return `/search?${params.toString()}`;
}

export function readSavedSearchFallbackState(raw: string | null): SavedSearchFallbackState {
	if (!raw) return { enabled: false, items: [] };

	try {
		const parsed = JSON.parse(raw) as {
			enabled?: unknown;
			items?: unknown;
		};
		if (!Array.isArray(parsed.items)) {
			return { enabled: false, items: [] };
		}
		return {
			enabled: Boolean(parsed.enabled),
			items: sortSavedSearches(
				parsed.items.map((item) =>
					normalizeSavedSearchRecord({
						...(item as SavedSearchRecord),
						syncPending: true,
					}),
				),
			),
		};
	} catch {
		return { enabled: false, items: [] };
	}
}

function writeSavedSearchFallbackState(state: SavedSearchFallbackState) {
	if (typeof window === "undefined") return;
	if (!state.enabled && state.items.length === 0) {
		window.localStorage.removeItem(SAVED_SEARCHES_FALLBACK_STORAGE_KEY);
		return;
	}
	window.localStorage.setItem(
		SAVED_SEARCHES_FALLBACK_STORAGE_KEY,
		JSON.stringify({
			enabled: state.enabled,
			items: sortSavedSearches(
				state.items.map((item) => ({ ...item, syncPending: true })),
			),
		}),
	);
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
	if (!response.ok) {
		const body = (await response.json().catch(() => null)) as { error?: string } | null;
		throw new Error(body?.error || `Request failed with ${response.status}`);
	}
	return (await response.json()) as T;
}

export function useSavedSearches() {
	const queryClient = useQueryClient();
	const [fallbackState, setFallbackState] = useState<SavedSearchFallbackState>(() =>
		typeof window === "undefined"
			? { enabled: false, items: [] }
			: readSavedSearchFallbackState(
					window.localStorage.getItem(
						SAVED_SEARCHES_FALLBACK_STORAGE_KEY,
					),
				),
	);

	const query = useQuery({
		queryKey: SAVED_SEARCHES_QUERY_KEY,
		retry: false,
		queryFn: async () => {
			const response = await fetch("/api/user/saved-searches");
			const records = await parseJsonResponse<SavedSearchApiRecord[]>(response);
			return sortSavedSearches(records.map(normalizeSavedSearchRecord));
		},
	});

	const apiRecords = query.data ?? [];
	const savedSearches = useMemo(
		() => (fallbackState.enabled ? fallbackState.items : apiRecords),
		[apiRecords, fallbackState],
	);
	const savedSearchesRef = useRef(savedSearches);
	savedSearchesRef.current = savedSearches;

	function persistFallback(items: SavedSearchRecord[]) {
		const nextState = {
			enabled: true,
			items: sortSavedSearches(
				items.map((item) => ({ ...item, syncPending: true })),
			),
		} satisfies SavedSearchFallbackState;
		setFallbackState(nextState);
		writeSavedSearchFallbackState(nextState);
	}

	function clearFallback() {
		const nextState = { enabled: false, items: [] } satisfies SavedSearchFallbackState;
		setFallbackState(nextState);
		writeSavedSearchFallbackState(nextState);
	}

	function setQueryCache(items: SavedSearchRecord[]) {
		queryClient.setQueryData(SAVED_SEARCHES_QUERY_KEY, sortSavedSearches(items));
	}

	const isSyncPending = fallbackState.enabled;
	const limitReached = savedSearches.length >= SAVED_SEARCH_LIMIT;

	return {
		savedSearches,
		isLoading: query.isLoading && !fallbackState.enabled,
		isSyncPending,
		canSave: savedSearches.length < SAVED_SEARCH_LIMIT,
		limitReached,
		async createSavedSearch(input: {
			label: string;
			query: string;
			scope: SavedSearchScope;
		}) {
			if (savedSearchesRef.current.length >= SAVED_SEARCH_LIMIT) {
				throw new Error("Saved search limit reached");
			}

			if (fallbackState.enabled) {
				persistFallback([
					{
						id: crypto.randomUUID(),
						label: input.label.trim(),
						query: input.query.trim(),
						scope: input.scope,
						lastUsedAt: new Date().toISOString(),
						syncPending: true,
					},
					...savedSearchesRef.current,
				]);
				return;
			}

			try {
				const response = await fetch("/api/user/saved-searches", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(input),
				});
				const record = normalizeSavedSearchRecord(
					await parseJsonResponse<SavedSearchApiRecord>(response),
				);
				setQueryCache([record, ...savedSearchesRef.current]);
			} catch {
				persistFallback([
					{
						id: crypto.randomUUID(),
						label: input.label.trim(),
						query: input.query.trim(),
						scope: input.scope,
						lastUsedAt: new Date().toISOString(),
						syncPending: true,
					},
					...savedSearchesRef.current,
				]);
			}
		},
		async renameSavedSearch(id: string, label: string) {
			const nextLabel = label.trim();
			if (!nextLabel) return;

			if (fallbackState.enabled) {
				persistFallback(
					savedSearchesRef.current.map((item) =>
						item.id === id
							? {
									...item,
									label: nextLabel,
									syncPending: true,
								}
							: item,
					),
				);
				return;
			}

			try {
				const response = await fetch(`/api/user/saved-searches/${id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ label: nextLabel }),
				});
				const record = normalizeSavedSearchRecord(
					await parseJsonResponse<SavedSearchApiRecord>(response),
				);
				setQueryCache(
					savedSearchesRef.current.map((item) =>
						item.id === id ? record : item,
					),
				);
			} catch {
				persistFallback(
					savedSearchesRef.current.map((item) =>
						item.id === id
							? {
									...item,
									label: nextLabel,
									syncPending: true,
								}
							: item,
					),
				);
			}
		},
		async deleteSavedSearch(id: string) {
			if (fallbackState.enabled) {
				persistFallback(
					savedSearchesRef.current.filter((item) => item.id !== id),
				);
				return;
			}

			try {
				const response = await fetch(`/api/user/saved-searches/${id}`, {
					method: "DELETE",
				});
				await parseJsonResponse<{ ok: boolean }>(response);
				setQueryCache(
					savedSearchesRef.current.filter((item) => item.id !== id),
				);
			} catch {
				persistFallback(
					savedSearchesRef.current.filter((item) => item.id !== id),
				);
			}
		},
		async markUsed(id: string) {
			const now = new Date().toISOString();
			const nextItems = savedSearchesRef.current.map((item) =>
				item.id === id
					? {
							...item,
							lastUsedAt: now,
							syncPending: fallbackState.enabled
								? true
								: item.syncPending,
						}
					: item,
			);

			if (fallbackState.enabled) {
				persistFallback(nextItems);
				return;
			}

			setQueryCache(nextItems);
			try {
				const response = await fetch(`/api/user/saved-searches/${id}`, {
					method: "PATCH",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ lastUsedAt: now }),
				});
				const record = normalizeSavedSearchRecord(
					await parseJsonResponse<SavedSearchApiRecord>(response),
				);
				setQueryCache(
					savedSearchesRef.current.map((item) =>
						item.id === id ? record : item,
					),
				);
				clearFallback();
			} catch {
				persistFallback(nextItems);
			}
		},
	};
}
