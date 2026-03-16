"use client";

import { cn } from "@/lib/utils";
import { useResponsiveSurfaceContext } from "@/components/shared/responsive-surface-provider";
import { useNavVisibility } from "@/components/shared/nav-visibility-provider";

export function NavAwareContent({ children }: { children: React.ReactNode }) {
	const { isNavHidden } = useNavVisibility();
	const { isReady, viewport } = useResponsiveSurfaceContext();
	const gutterClassName = !isReady
		? "px-3 sm:px-4 lg:px-5"
		: viewport === "phone"
			? "px-3"
			: viewport === "tablet"
				? "px-4"
				: "px-5";

	return (
		<div
			className={cn(
				"flex w-full min-w-0 flex-col overflow-x-hidden pt-2 transition-[margin-top,height] duration-200 ease-out lg:overflow-auto",
				gutterClassName,
				isNavHidden
					? "mt-0 lg:h-dvh"
					: "mt-10 lg:h-[calc(100dvh-var(--spacing)*10)]",
			)}
		>
			{children}
		</div>
	);
}
