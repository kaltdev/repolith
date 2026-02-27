"use client";

import { createContext, useContext, useRef, useCallback, type ReactNode } from "react";
import type { MutationEvent } from "@/lib/mutation-events";

type Listener = (event: MutationEvent) => void;

interface MutationEventContextValue {
	emit: (event: MutationEvent) => void;
	subscribe: (listener: Listener) => () => void;
}

const MutationEventContext = createContext<MutationEventContextValue | null>(null);

export function MutationEventProvider({ children }: { children: ReactNode }) {
	const listenersRef = useRef(new Set<Listener>());

	const emit = useCallback((event: MutationEvent) => {
		for (const listener of listenersRef.current) {
			listener(event);
		}
	}, []);

	const subscribe = useCallback((listener: Listener) => {
		listenersRef.current.add(listener);
		return () => {
			listenersRef.current.delete(listener);
		};
	}, []);

	return (
		<MutationEventContext.Provider value={{ emit, subscribe }}>
			{children}
		</MutationEventContext.Provider>
	);
}

const noopCtx: MutationEventContextValue = {
	emit: () => {},
	subscribe: () => () => {},
};

export function useMutationEvents() {
	const ctx = useContext(MutationEventContext);
	return ctx ?? noopCtx;
}
