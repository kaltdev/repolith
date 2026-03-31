"use client";

// Provides a reusable optimistic mutation runner for dashboard quick actions.

import {
	useMutation,
	useQueryClient,
	type QueryKey,
	type QueryClient,
} from "@tanstack/react-query";
import { useMutationEvents } from "@/components/shared/mutation-event-provider";
import type { MutationEvent } from "@/lib/mutation-events";

export interface QuickActionContext<TData = unknown, TVariables = unknown, TCache = unknown> {
	queryClient: QueryClient;
	queryKey: QueryKey;
	previousData: TCache | undefined;
	applyOptimisticUpdate?: (
		current: TCache | undefined,
		variables: TVariables,
	) => TCache | undefined;
	applySuccessUpdate?: (
		current: TCache | undefined,
		data: TData,
		variables: TVariables,
	) => TCache | undefined;
	emit?: (event: MutationEvent) => void;
	successEvent?:
		| MutationEvent
		| ((data: TData, variables: TVariables) => MutationEvent | null | undefined);
}

export interface QuickActionOptions<TData = unknown, TVariables = unknown, TCache = unknown> {
	queryKey: QueryKey;
	mutationFn: (variables: TVariables) => Promise<TData>;
	invalidateQueries?: QueryKey[];
	applyOptimisticUpdate?: (
		current: TCache | undefined,
		variables: TVariables,
	) => TCache | undefined;
	applySuccessUpdate?: (
		current: TCache | undefined,
		data: TData,
		variables: TVariables,
	) => TCache | undefined;
	emit?: (event: MutationEvent) => void;
	successEvent?:
		| MutationEvent
		| ((data: TData, variables: TVariables) => MutationEvent | null | undefined);
}

export interface QuickActionError extends Error {
	cause?: unknown;
}

export async function executeQuickAction<TData = unknown, TVariables = unknown, TCache = unknown>(
	queryClient: QueryClient,
	options: QuickActionOptions<TData, TVariables, TCache>,
	variables: TVariables,
): Promise<TData> {
	const {
		queryKey,
		mutationFn,
		invalidateQueries = [options.queryKey],
		applyOptimisticUpdate,
		applySuccessUpdate,
		emit,
		successEvent,
	} = options;

	const previousData = queryClient.getQueryData<TCache>(queryKey);

	if (applyOptimisticUpdate) {
		queryClient.setQueryData<TCache | undefined>(queryKey, (current) =>
			applyOptimisticUpdate(current, variables),
		);
	}

	try {
		const result = await mutationFn(variables);

		if (applySuccessUpdate) {
			queryClient.setQueryData<TCache | undefined>(queryKey, (current) =>
				applySuccessUpdate(current, result, variables),
			);
		}

		if (successEvent) {
			const event =
				typeof successEvent === "function"
					? successEvent(result, variables)
					: successEvent;
			if (event) {
				emit?.(event);
			}
		}

		return result;
	} catch (error) {
		if (typeof previousData === "undefined") {
			queryClient.removeQueries({ queryKey, exact: true });
		} else {
			queryClient.setQueryData(queryKey, previousData);
		}
		const normalizedError =
			error instanceof Error ? error : new Error("Quick action failed");
		(normalizedError as QuickActionError).cause = error;
		throw normalizedError;
	} finally {
		await Promise.all(
			invalidateQueries.map((key) =>
				queryClient.invalidateQueries({ queryKey: key }),
			),
		);
	}
}

export function useQuickAction<TData = unknown, TVariables = unknown, TCache = unknown>(
	options: QuickActionOptions<TData, TVariables, TCache>,
) {
	const queryClient = useQueryClient();
	const { emit } = useMutationEvents();

	return useMutation({
		mutationFn: (variables: TVariables) =>
			executeQuickAction(
				queryClient,
				{ ...options, emit: options.emit ?? emit },
				variables,
			),
	});
}
