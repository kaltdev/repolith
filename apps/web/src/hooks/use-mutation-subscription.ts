"use client";

import { useEffect, useRef } from "react";
import { useMutationEvents } from "@/components/shared/mutation-event-provider";
import type { MutationEvent, MutationEventType } from "@/lib/mutation-events";

export function useMutationSubscription(
	types: MutationEventType[],
	handler: (event: MutationEvent) => void,
) {
	const handlerRef = useRef(handler);
	handlerRef.current = handler;

	const { subscribe } = useMutationEvents();

	useEffect(() => {
		const typesSet = new Set(types);
		return subscribe((event) => {
			if (typesSet.has(event.type)) {
				handlerRef.current(event);
			}
		});
	}, [subscribe, types.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps
}
