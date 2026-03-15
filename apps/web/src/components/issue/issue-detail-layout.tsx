"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { PanelRight } from "lucide-react";
import { useResponsiveSurfaceContext } from "@/components/shared/responsive-surface-provider";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { getResponsiveSurfaceDecision } from "@/lib/responsive-surface-policy";
import { cn } from "@/lib/utils";

interface IssueDetailLayoutProps {
	header: React.ReactNode;
	timeline: React.ReactNode;
	commentForm?: React.ReactNode;
	sidebar?: React.ReactNode;
}

export function IssueDetailLayout({
	header,
	timeline,
	commentForm,
	sidebar,
}: IssueDetailLayoutProps) {
	const { width } = useResponsiveSurfaceContext();
	const scrollRef = useRef<HTMLDivElement>(null);
	const previousModeRef = useRef<"bottomSheet" | "persistent" | "rightSheet" | null>(null);
	const [canScrollUp, setCanScrollUp] = useState(false);
	const [canScrollDown, setCanScrollDown] = useState(false);
	const [sheetOpen, setSheetOpen] = useState(false);
	const sidebarDecision = getResponsiveSurfaceDecision({
		routeKind: "issueDetail",
		surfaceId: "metadataSidebar",
		viewportWidth: width,
	});
	const sidebarMode =
		sidebarDecision.mode === "persistent"
			? "persistent"
			: sidebarDecision.mode === "bottomSheet"
				? "bottomSheet"
				: "rightSheet";
	const isPersistentSidebar = !!sidebar && sidebarMode === "persistent";

	const updateScrollState = useCallback(() => {
		const el = scrollRef.current;
		if (!el) return;
		setCanScrollUp(el.scrollTop > 0);
		setCanScrollDown(el.scrollTop + el.clientHeight < el.scrollHeight - 1);
	}, []);

	useEffect(() => {
		const el = scrollRef.current;
		if (!el) return;
		updateScrollState();
		el.addEventListener("scroll", updateScrollState);
		const resizeObserver = new ResizeObserver(updateScrollState);
		resizeObserver.observe(el);
		return () => {
			el.removeEventListener("scroll", updateScrollState);
			resizeObserver.disconnect();
		};
	}, [updateScrollState]);

	useEffect(() => {
		if (!sidebar) {
			setSheetOpen(false);
			previousModeRef.current = null;
			return;
		}

		const previousMode = previousModeRef.current;

		if (previousMode === null) {
			previousModeRef.current = sidebarMode;
			return;
		}

		if (previousMode === sidebarMode) return;

		if (previousMode === "persistent") {
			setSheetOpen(true);
		}

		if (sidebarMode === "persistent" && sheetOpen) {
			setSheetOpen(false);
		}

		previousModeRef.current = sidebarMode;
	}, [sidebar, sidebarMode, sheetOpen]);

	return (
		<div className="flex-1 min-h-0 flex flex-col">
			<div className="shrink-0 pt-3">{header}</div>
			{sidebar && !isPersistentSidebar ? (
				<div className="shrink-0 pt-3">
					<button
						type="button"
						onClick={() => setSheetOpen(true)}
						className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[11px] font-mono text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors cursor-pointer"
					>
						<PanelRight className="w-3.5 h-3.5" />
						Details
					</button>
				</div>
			) : null}

			<div className="flex-1 min-h-0 flex gap-6">
				{/* Main thread */}
				<div className="relative flex-1 min-w-0">
					{/* Top shadow */}
					<div
						className={cn(
							"pointer-events-none absolute top-0 left-0 right-4 h-6 bg-gradient-to-b from-background to-transparent z-10 transition-opacity duration-200",
							canScrollUp ? "opacity-100" : "opacity-0",
						)}
					/>
					{/* Bottom shadow */}
					<div
						className={cn(
							"pointer-events-none absolute bottom-0 left-0 right-4 h-6 bg-gradient-to-t from-background to-transparent z-10 transition-opacity duration-200",
							canScrollDown ? "opacity-100" : "opacity-0",
						)}
					/>
					<div
						ref={scrollRef}
						className="h-full overflow-y-auto pb-8 pl-1 pr-4"
					>
						<div>
							<div className="space-y-3">{timeline}</div>

							{commentForm && (
								<div className="mt-6 pt-4">
									{commentForm}
								</div>
							)}
						</div>
					</div>
				</div>

				{/* Right sidebar */}
				{sidebar && isPersistentSidebar && (
					<div className="w-[240px] xl:w-[280px] 2xl:w-[320px] shrink-0 border-l border-border/40 pl-6 overflow-y-auto pb-8">
						<div className="space-y-5 pt-1">{sidebar}</div>
					</div>
				)}
			</div>
			{sidebar && !isPersistentSidebar ? (
				<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
					<SheetContent
						side={
							sidebarMode === "bottomSheet"
								? "bottom"
								: "right"
						}
						title="Details"
						showCloseButton={false}
						className={cn(
							"flex flex-col gap-0 p-0",
							sidebarMode === "bottomSheet"
								? "max-h-[78dvh] rounded-t-2xl border-t border-l-0"
								: "w-[min(92vw,22rem)] max-w-[22rem]",
						)}
					>
						<div className="shrink-0 border-b border-border/60 px-4 py-3">
							<div className="flex items-center justify-between gap-3">
								<span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60">
									Details
								</span>
								<button
									type="button"
									onClick={() =>
										setSheetOpen(false)
									}
									className="rounded-md px-2 py-1 text-[11px] font-mono text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors cursor-pointer"
								>
									Close
								</button>
							</div>
						</div>
						<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
							<div className="space-y-5">{sidebar}</div>
						</div>
					</SheetContent>
				</Sheet>
			) : null}
		</div>
	);
}
