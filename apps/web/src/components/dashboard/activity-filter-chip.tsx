"use client";

// Renders a dismissible active activity filter chip using the existing badge style.

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { ActivityFilterChipModel } from "@/hooks/use-activity-filters";

export function ActivityFilterChip({
	chip,
	onRemove,
}: {
	chip: ActivityFilterChipModel;
	onRemove: () => void;
}) {
	return (
		<Badge
			variant="outline"
			className={cn("gap-1.5 px-2 py-0.5 text-[11px]", "bg-background")}
		>
			<span className="truncate">{chip.label}</span>
			<button
				type="button"
				className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
				aria-label={`Remove ${chip.label}`}
				onClick={onRemove}
			>
				<X className="size-3" />
			</button>
		</Badge>
	);
}
