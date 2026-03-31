"use client";

// Groups quick-action buttons and keeps them hidden until hover or coarse pointers.

import type * as React from "react";
import { cn } from "@/lib/utils";

export function QuickActionBar({
	children,
	className,
	ariaLabel = "Quick actions",
}: {
	children: React.ReactNode;
	className?: string;
	ariaLabel?: string;
}) {
	return (
		<div
			role="toolbar"
			aria-label={ariaLabel}
			className={cn(
				"flex flex-wrap items-center gap-2 border-t border-border px-3 py-2 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 pointer-coarse:opacity-100",
				className,
			)}
		>
			{children}
		</div>
	);
}
