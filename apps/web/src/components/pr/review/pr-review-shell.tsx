"use client";

import type { ReactNode } from "react";
import { ResizeHandle } from "@/components/ui/resize-handle";

interface PRReviewShellProps {
	sidebarCollapsed: boolean;
	sidebarWidth: number;
	isSidebarDragging: boolean;
	sidebar: ReactNode;
	children: ReactNode;
	onSidebarResize: (clientX: number) => void;
	onSidebarDragStart: () => void;
	onSidebarDragEnd: () => void;
	onSidebarReset: () => void;
}

export function PRReviewShell({
	sidebarCollapsed,
	sidebarWidth,
	isSidebarDragging,
	sidebar,
	children,
	onSidebarResize,
	onSidebarDragStart,
	onSidebarDragEnd,
	onSidebarReset,
}: PRReviewShellProps) {
	return (
		<>
			{!sidebarCollapsed && (
				<>
					<div
						className="hidden lg:flex flex-col shrink-0 border-r border-border pr-2"
						style={{
							width: sidebarWidth,
							transition: isSidebarDragging
								? "none"
								: "width 0.2s cubic-bezier(0.4,0,0.2,1)",
						}}
					>
						{sidebar}
					</div>

					<div className="hidden lg:flex shrink-0">
						<ResizeHandle
							onResize={onSidebarResize}
							onDragStart={onSidebarDragStart}
							onDragEnd={onSidebarDragEnd}
							onDoubleClick={onSidebarReset}
						/>
					</div>
				</>
			)}

			<div className="flex-1 min-w-0 min-h-0 flex flex-col">{children}</div>
		</>
	);
}
