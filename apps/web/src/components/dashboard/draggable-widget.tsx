"use client";

// Wraps a dashboard widget in sortable behavior with a visible drag handle.

import type * as React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardWidgetId } from "@/types/dashboard";

function toTransformString(
	transform: {
		x: number;
		y: number;
		scaleX: number;
		scaleY: number;
	} | null,
) {
	if (!transform) return undefined;
	return `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`;
}

export function DraggableWidget({
	id,
	title,
	descriptionId,
	children,
}: {
	id: DashboardWidgetId;
	title: string;
	descriptionId: string;
	children: React.ReactNode;
}) {
	const { attributes, listeners, setNodeRef, transform, transition, isDragging, isOver } =
		useSortable({ id });

	return (
		<section
			ref={setNodeRef}
			id={descriptionId}
			aria-label={title}
			style={{
				transform: toTransformString(transform),
				transition,
			}}
			className={cn(
				"rounded-md border border-border bg-background",
				isDragging && "opacity-70 shadow-xs",
				isOver && "border-dashed",
			)}
		>
			<div className="flex items-center justify-between border-b border-border px-4 py-2">
				<h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
					{title}
				</h2>
				<Button
					type="button"
					variant="ghost"
					size="icon"
					aria-label={`Reorder ${title}`}
					{...attributes}
					{...listeners}
				>
					<GripVertical className="size-4" />
				</Button>
			</div>
			<div>{children}</div>
		</section>
	);
}
