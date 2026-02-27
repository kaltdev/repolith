"use client";

import { useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ResizeHandleProps {
	/** Called continuously during drag with clientX pixel position */
	onResize: (clientX: number) => void;
	/** Called when drag starts */
	onDragStart?: () => void;
	/** Called when drag ends */
	onDragEnd?: () => void;
	/** Double click handler (e.g. reset to default) */
	onDoubleClick?: () => void;
	className?: string;
}

export function ResizeHandle({
	onResize,
	onDragStart,
	onDragEnd,
	onDoubleClick,
	className,
}: ResizeHandleProps) {
	const [isDragging, setIsDragging] = useState(false);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			setIsDragging(true);
			onDragStart?.();
		},
		[onDragStart],
	);

	useEffect(() => {
		if (!isDragging) return;

		const handleMouseMove = (e: MouseEvent) => {
			onResize(e.clientX);
		};

		const handleMouseUp = () => {
			setIsDragging(false);
			onDragEnd?.();
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
		document.body.style.userSelect = "none";
		document.body.style.cursor = "col-resize";

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
			document.body.style.userSelect = "";
			document.body.style.cursor = "";
		};
	}, [isDragging, onResize, onDragEnd]);

	return (
		<div
			onMouseDown={handleMouseDown}
			onDoubleClick={onDoubleClick}
			className={cn(
				"relative shrink-0 w-0 group/resize cursor-col-resize z-10",
				className,
			)}
		>
			{/* Wider invisible hit area */}
			<div className="absolute inset-y-0 -left-[5px] w-[11px]" />
			{/* Visible line */}
			<div
				className={cn(
					"absolute inset-y-0 -left-px w-[2px] transition-all duration-150",
					isDragging
						? "bg-foreground/25"
						: "bg-transparent group-hover/resize:bg-foreground/15",
				)}
			/>
		</div>
	);
}
