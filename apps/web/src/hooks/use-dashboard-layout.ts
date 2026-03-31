"use client";

// Owns dashboard widget order loading, persistence, and reorder helpers for the Personal dashboard layout.

import { useCallback, useLayoutEffect, useState } from "react";
import {
	DEFAULT_DASHBOARD_WIDGET_ORDER,
	DASHBOARD_WIDGET_IDS,
	type DashboardWidgetId,
} from "@/types/dashboard";

const STORAGE_KEY = "dashboard_widget_order";

type DashboardWidgetStorage = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function sanitizeDashboardWidgetOrder(value: unknown): DashboardWidgetId[] {
	if (!Array.isArray(value)) {
		return [...DEFAULT_DASHBOARD_WIDGET_ORDER];
	}

	const seen = new Set<DashboardWidgetId>();
	const known = new Set(DASHBOARD_WIDGET_IDS);
	const ordered = value.filter((item): item is DashboardWidgetId => {
		if (typeof item !== "string" || !known.has(item as DashboardWidgetId)) {
			return false;
		}
		if (seen.has(item as DashboardWidgetId)) {
			return false;
		}
		seen.add(item as DashboardWidgetId);
		return true;
	});

	for (const id of DEFAULT_DASHBOARD_WIDGET_ORDER) {
		if (!seen.has(id)) {
			ordered.push(id);
		}
	}

	return ordered;
}

export function readDashboardWidgetOrder(storage: DashboardWidgetStorage): DashboardWidgetId[] {
	const raw = storage.getItem(STORAGE_KEY);
	if (!raw) {
		return [...DEFAULT_DASHBOARD_WIDGET_ORDER];
	}

	try {
		return sanitizeDashboardWidgetOrder(JSON.parse(raw) as unknown);
	} catch {
		return [...DEFAULT_DASHBOARD_WIDGET_ORDER];
	}
}

export function writeDashboardWidgetOrder(
	storage: DashboardWidgetStorage,
	order: DashboardWidgetId[],
): void {
	storage.setItem(STORAGE_KEY, JSON.stringify(order));
}

export function clearDashboardWidgetOrder(storage: DashboardWidgetStorage): void {
	storage.removeItem(STORAGE_KEY);
}

export function moveDashboardWidgetOrder(
	order: DashboardWidgetId[],
	activeId: DashboardWidgetId,
	overId: DashboardWidgetId,
): DashboardWidgetId[] {
	if (activeId === overId) {
		return [...order];
	}

	const next = [...order];
	const fromIndex = next.indexOf(activeId);
	const toIndex = next.indexOf(overId);

	if (fromIndex === -1 || toIndex === -1) {
		return sanitizeDashboardWidgetOrder(next);
	}

	const [moved] = next.splice(fromIndex, 1);
	next.splice(toIndex, 0, moved);

	return sanitizeDashboardWidgetOrder(next);
}

export function useDashboardLayout() {
	const [widgetOrder, setWidgetOrder] = useState<DashboardWidgetId[]>(
		DEFAULT_DASHBOARD_WIDGET_ORDER,
	);
	const [isReady, setIsReady] = useState(false);

	useLayoutEffect(() => {
		setIsReady(true);
		setWidgetOrder(readDashboardWidgetOrder(window.localStorage));
	}, []);

	const updateWidgetOrder = useCallback((nextOrder: DashboardWidgetId[]) => {
		const sanitized = sanitizeDashboardWidgetOrder(nextOrder);
		setWidgetOrder(sanitized);
		if (typeof window !== "undefined") {
			writeDashboardWidgetOrder(window.localStorage, sanitized);
		}
	}, []);

	const moveWidget = useCallback((activeId: DashboardWidgetId, overId: DashboardWidgetId) => {
		setWidgetOrder((currentOrder) => {
			const nextOrder = moveDashboardWidgetOrder(currentOrder, activeId, overId);
			if (typeof window !== "undefined") {
				writeDashboardWidgetOrder(window.localStorage, nextOrder);
			}
			return nextOrder;
		});
	}, []);

	const resetLayout = useCallback(() => {
		setWidgetOrder([...DEFAULT_DASHBOARD_WIDGET_ORDER]);
		if (typeof window !== "undefined") {
			clearDashboardWidgetOrder(window.localStorage);
		}
	}, []);

	return {
		widgetOrder,
		setWidgetOrder: updateWidgetOrder,
		moveWidget,
		resetLayout,
		isReady,
	};
}
