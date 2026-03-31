"use client";

// Renders personal dashboard widgets in persisted sortable order.

import type * as React from "react";
import {
	DndContext,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
	type DragEndEvent,
} from "@dnd-kit/core";
import {
	SortableContext,
	rectSortingStrategy,
	sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Button } from "@/components/ui/button";
import { useDashboardLayout } from "@/hooks/use-dashboard-layout";
import { cn } from "@/lib/utils";
import type { DashboardWidgetId } from "@/types/dashboard";
import { DraggableWidget } from "./draggable-widget";
import { WidgetErrorBoundary } from "./widget-error-boundary";

export interface DashboardWidgetDefinition {
	id: DashboardWidgetId;
	title: string;
	content: React.ReactNode;
}

export function orderDashboardWidgets(
	widgetOrder: DashboardWidgetId[],
	widgets: DashboardWidgetDefinition[],
) {
	return widgetOrder
		.map((id) => widgets.find((widget) => widget.id === id))
		.filter((widget): widget is DashboardWidgetDefinition => Boolean(widget));
}

export function DashboardLayout({
	widgets,
	className,
}: {
	widgets: DashboardWidgetDefinition[];
	className?: string;
}) {
	const { widgetOrder, moveWidget, resetLayout } = useDashboardLayout();
	const orderedWidgets = orderDashboardWidgets(widgetOrder, widgets);
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: { distance: 8 },
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
	);

	function handleDragEnd(event: DragEndEvent) {
		if (!event.over) return;
		moveWidget(
			event.active.id as DashboardWidgetId,
			event.over.id as DashboardWidgetId,
		);
	}

	return (
		<div className={cn("flex flex-col gap-3", className)}>
			<div className="flex justify-end">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={resetLayout}
				>
					Reset layout
				</Button>
			</div>
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={handleDragEnd}
			>
				<SortableContext
					items={orderedWidgets.map((widget) => widget.id)}
					strategy={rectSortingStrategy}
				>
					<div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
						{orderedWidgets.map((widget) => (
							<WidgetErrorBoundary
								key={widget.id}
								title={widget.title}
							>
								<DraggableWidget
									id={widget.id}
									title={widget.title}
									descriptionId={`dashboard-widget-${widget.id}`}
								>
									{widget.content}
								</DraggableWidget>
							</WidgetErrorBoundary>
						))}
					</div>
				</SortableContext>
			</DndContext>
		</div>
	);
}
