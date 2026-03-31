// Verifies the reusable quick-action executor with plain React Query clients.

import { describe, expect, it, vi } from "vitest";
import { QueryClient } from "@tanstack/react-query";
import { executeQuickAction } from "./use-quick-action";

describe("executeQuickAction", () => {
	it("applies optimistic updates, emits success, and invalidates the cache", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(["dashboard", "cards"], [{ id: 1, status: "open" }]);
		const invalidateQueries = vi
			.spyOn(queryClient, "invalidateQueries")
			.mockResolvedValue(undefined as never);
		const emit = vi.fn();
		const mutationFn = vi.fn().mockResolvedValue({ id: 1, status: "closed" });

		const result = await executeQuickAction(
			queryClient,
			{
				queryKey: ["dashboard", "cards"],
				mutationFn,
				emit,
				successEvent: {
					type: "pr:closed",
					owner: "acme",
					repo: "api",
					number: 1,
				},
				applyOptimisticUpdate: (
					current: Array<{ id: number; status: string }> | undefined,
				) => [...(current ?? []), { id: 2, status: "pending" }],
				applySuccessUpdate: () => [{ id: 1, status: "closed" }],
				invalidateQueries: [["dashboard", "cards"]],
			},
			{ id: 1 },
		);

		expect(result).toEqual({ id: 1, status: "closed" });
		expect(queryClient.getQueryData(["dashboard", "cards"])).toEqual([
			{ id: 1, status: "closed" },
		]);
		expect(emit).toHaveBeenCalledWith({
			type: "pr:closed",
			owner: "acme",
			repo: "api",
			number: 1,
		});
		expect(mutationFn).toHaveBeenCalledWith({ id: 1 });
		expect(invalidateQueries).toHaveBeenCalledWith({
			queryKey: ["dashboard", "cards"],
		});
	});

	it("rolls back to the previous cache snapshot on failure", async () => {
		const queryClient = new QueryClient();
		queryClient.setQueryData(["dashboard", "cards"], [{ id: 1, status: "open" }]);
		vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined as never);
		const mutationFn = vi.fn().mockRejectedValue(new Error("boom"));

		await expect(
			executeQuickAction(
				queryClient,
				{
					queryKey: ["dashboard", "cards"],
					mutationFn,
					applyOptimisticUpdate: (
						current:
							| Array<{ id: number; status: string }>
							| undefined,
					) => [...(current ?? []), { id: 2, status: "pending" }],
				},
				{ id: 1 },
			),
		).rejects.toThrow("boom");

		expect(queryClient.getQueryData(["dashboard", "cards"])).toEqual([
			{ id: 1, status: "open" },
		]);
	});

	it("removes optimistic cache entries when there was no previous data", async () => {
		const queryClient = new QueryClient();
		const removeQueries = vi
			.spyOn(queryClient, "removeQueries")
			.mockResolvedValue(undefined as never);
		vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined as never);
		const mutationFn = vi.fn().mockRejectedValue(new Error("boom"));

		await expect(
			executeQuickAction(
				queryClient,
				{
					queryKey: ["dashboard", "cards"],
					mutationFn,
					applyOptimisticUpdate: () => [{ id: 2, status: "pending" }],
				},
				{ id: 1 },
			),
		).rejects.toThrow("boom");

		expect(removeQueries).toHaveBeenCalledWith({
			queryKey: ["dashboard", "cards"],
			exact: true,
		});
	});
});
