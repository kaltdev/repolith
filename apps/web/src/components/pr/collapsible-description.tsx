"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const COLLAPSED_HEIGHT = 150;

export function CollapsibleDescription({ children }: { children: React.ReactNode }) {
	const contentRef = useRef<HTMLDivElement>(null);
	const [needsCollapse, setNeedsCollapse] = useState(false);
	const [expanded, setExpanded] = useState(false);

	useEffect(() => {
		if (!contentRef.current) return;
		const height = contentRef.current.scrollHeight;
		setNeedsCollapse(height > COLLAPSED_HEIGHT + 40);
	}, []);

	if (!needsCollapse) {
		return <div ref={contentRef}>{children}</div>;
	}

	return (
		<div className="relative">
			<div
				ref={contentRef}
				className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
				style={{
					maxHeight: expanded
						? contentRef.current?.scrollHeight
						: COLLAPSED_HEIGHT,
				}}
			>
				{children}
			</div>
			{!expanded && (
				<div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background to-transparent pointer-events-none" />
			)}
			<button
				onClick={() => setExpanded((e) => !e)}
				className={cn(
					"flex items-center gap-1 text-[11px] font-mono text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-pointer",
					expanded ? "mt-1" : "-mt-1 relative z-10",
				)}
			>
				<ChevronDown
					className={cn(
						"w-3 h-3 transition-transform",
						expanded && "rotate-180",
					)}
				/>
				{expanded ? "Show less" : "Show more"}
			</button>
		</div>
	);
}
