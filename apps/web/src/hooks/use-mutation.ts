"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useMutationEvents } from "@/components/shared/mutation-event-provider";
import type { MutationEvent } from "@/lib/mutation-events";

interface MutateOptions<T> {
	action: () => Promise<T>;
	event?: MutationEvent;
	onSuccess?: (result: T) => void;
	onError?: (error: unknown) => void;
	refresh?: boolean;
}

export function useMutation() {
	const [isPending, startTransition] = useTransition();
	const router = useRouter();
	const { emit } = useMutationEvents();

	const mutate = <T>(options: MutateOptions<T>) => {
		const { action, event, onSuccess, onError, refresh = true } = options;

		startTransition(async () => {
			try {
				const result = await action();
				if (event) emit(event);
				onSuccess?.(result);
				if (refresh) router.refresh();
			} catch (error) {
				onError?.(error);
			}
		});
	};

	return { mutate, isPending, emit };
}
