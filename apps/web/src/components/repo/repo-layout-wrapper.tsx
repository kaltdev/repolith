"use client";

import { RepoBreadcrumb } from "@/components/repo/repo-breadcrumb";
import { useState, useCallback, useRef, useTransition, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { PanelLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useResponsiveSurfaceContext } from "@/components/shared/responsive-surface-provider";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { getResponsiveSurfaceDecision } from "@/lib/responsive-surface-policy";
import { cn } from "@/lib/utils";
import { setRepoSidebarState } from "./repo-sidebar-actions";

interface RepoLayoutWrapperProps {
	sidebar: React.ReactNode;
	summary?: React.ReactNode;
	summaryActions?: React.ReactNode;
	children: React.ReactNode;
	owner: string;
	repo: string;
	ownerType: string;
	ownerAvatarUrl?: string;
	initialCollapsed?: boolean;
	initialWidth?: number;
}

const DEFAULT_WIDTH = 340;
const MAX_WIDTH = 400;
const MIN_WIDTH = 200;
const SNAP_THRESHOLD = 120;
const SPRING = { type: "spring" as const, stiffness: 500, damping: 35 };

export function RepoLayoutWrapper({
	sidebar,
	summary,
	summaryActions,
	children,
	owner,
	repo,
	initialCollapsed = false,
	initialWidth = DEFAULT_WIDTH,
	ownerType,
	ownerAvatarUrl,
}: RepoLayoutWrapperProps) {
	const pathname = usePathname();
	const isPrPage = pathname.includes("/pulls/");
	const isCodeLikeRoute =
		pathname.includes("/code") ||
		pathname.includes("/tree/") ||
		pathname.includes("/blob/");
	const effectiveInitialCollapsed = isPrPage ? true : initialCollapsed;
	const { width } = useResponsiveSurfaceContext();

	const [sidebarWidth, setSidebarWidth] = useState(
		effectiveInitialCollapsed ? 0 : initialWidth,
	);
	const [sheetOpen, setSheetOpen] = useState(false);
	const lastOpenWidthRef = useRef(initialWidth);
	const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
	const isDraggingRef = useRef(false);
	const [isDragging, setIsDragging] = useState(false);
	const [, startTransition] = useTransition();
	const collapsed = sidebarWidth === 0;
	const prevIsPrPageRef = useRef(isPrPage);
	const [repoNavSlot, setRepoNavSlot] = useState<HTMLElement | null>(null);
	const previousModeRef = useRef<"bottomSheet" | "persistent" | "rightSheet" | null>(null);

	const sidebarDecision = getResponsiveSurfaceDecision({
		anotherMajorSurfaceIsPersistent: isCodeLikeRoute,
		routeKind: isCodeLikeRoute ? "repoCode" : "repoOverview",
		surfaceId: "repoSidebar",
		viewportWidth: width,
	});
	const sidebarMode =
		sidebarDecision.mode === "persistent"
			? "persistent"
			: sidebarDecision.mode === "bottomSheet"
				? "bottomSheet"
				: "rightSheet";
	const isPersistentSidebar = sidebarMode === "persistent";

	useEffect(() => {
		const el = document.getElementById("repo-nav-breadcrumb");
		setRepoNavSlot(el);
	}, []);

	useEffect(() => {
		const previousMode = previousModeRef.current;

		if (previousMode === null) {
			previousModeRef.current = sidebarMode;
			return;
		}

		if (previousMode === sidebarMode) return;

		if (previousMode === "persistent" && sidebarWidth > 0) {
			setSheetOpen(true);
		}

		if (sidebarMode === "persistent" && sheetOpen) {
			const nextWidth = lastOpenWidthRef.current || DEFAULT_WIDTH;
			setSidebarWidth(nextWidth);
			setSheetOpen(false);
		}

		previousModeRef.current = sidebarMode;
	}, [sheetOpen, sidebarMode, sidebarWidth]);

	useEffect(() => {
		const wasOnPrPage = prevIsPrPageRef.current;
		prevIsPrPageRef.current = isPrPage;

		if (isPrPage && !wasOnPrPage && sidebarWidth > 0) {
			lastOpenWidthRef.current = sidebarWidth;
			setSidebarWidth(0);
		}
	}, [isPrPage, sidebarWidth]);

	const persistState = useCallback((isCollapsed: boolean, width: number) => {
		startTransition(() => {
			setRepoSidebarState(isCollapsed, width);
		});
	}, []);

	const handleExpand = useCallback(() => {
		const width = lastOpenWidthRef.current || DEFAULT_WIDTH;
		if (isPersistentSidebar) {
			setSidebarWidth(width);
			persistState(false, width);
			return;
		}
		setSheetOpen(true);
	}, [isPersistentSidebar, persistState]);

	const handleCollapse = useCallback(() => {
		if (isPersistentSidebar) {
			if (sidebarWidth > 0) lastOpenWidthRef.current = sidebarWidth;
			setSidebarWidth(0);
			persistState(true, lastOpenWidthRef.current);
			return;
		}
		setSheetOpen(false);
	}, [isPersistentSidebar, persistState, sidebarWidth]);

	const handleDragStart = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			dragRef.current = {
				startX: e.clientX,
				startWidth: sidebarWidth || lastOpenWidthRef.current,
			};
			isDraggingRef.current = false;
			setIsDragging(true);
			const onMove = (ev: MouseEvent) => {
				if (!dragRef.current) return;
				const delta = ev.clientX - dragRef.current.startX;
				if (!isDraggingRef.current && Math.abs(delta) > 3) {
					isDraggingRef.current = true;
				}
				if (!isDraggingRef.current) return;
				const raw = dragRef.current.startWidth + delta;
				if (raw < SNAP_THRESHOLD) {
					setSidebarWidth(0);
				} else {
					const clamped = Math.max(
						MIN_WIDTH,
						Math.min(MAX_WIDTH, raw),
					);
					setSidebarWidth(clamped);
					lastOpenWidthRef.current = clamped;
				}
			};
			const onUp = () => {
				const didDrag = isDraggingRef.current;
				const finalWidth = sidebarWidth;
				const finalCollapsed = finalWidth === 0;
				dragRef.current = null;
				isDraggingRef.current = false;
				setIsDragging(false);
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
				document.body.style.userSelect = "";
				document.body.style.cursor = "";
				if (!didDrag) {
					handleCollapse();
				} else {
					persistState(
						finalCollapsed,
						finalCollapsed
							? lastOpenWidthRef.current
							: finalWidth,
					);
				}
			};
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
			document.body.style.userSelect = "none";
			document.body.style.cursor = "col-resize";
		},
		[sidebarWidth, handleCollapse, persistState],
	);
	const contentInsetStyle = {
		"--repo-pr": isPersistentSidebar && collapsed ? "calc(var(--spacing) * 4)" : "1rem",
	} as React.CSSProperties;
	const compactRepoHeader =
		!isPersistentSidebar && (summary || summaryActions) ? (
			<div className="px-4 pt-3 pb-2">
				{summary ? <div className="min-w-0">{summary}</div> : null}
				<div
					className={cn(
						"flex flex-wrap items-center gap-2",
						summary ? "mt-2" : "",
					)}
				>
					{summaryActions}
					<button
						type="button"
						onClick={() => setSheetOpen(true)}
						className="inline-flex h-8 items-center gap-1.5 rounded-full bg-transparent px-2.5 text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:bg-muted/55 hover:text-foreground cursor-pointer"
					>
						<PanelLeft className="w-3 h-3" />
						View more
					</button>
				</div>
			</div>
		) : null;

	return (
		<div
			className={cn(
				"flex flex-1 min-h-0",
				isPersistentSidebar ? "flex-row" : "flex-col",
			)}
		>
			{isPersistentSidebar ? (
				<motion.div
					className="shrink-0 overflow-hidden min-h-0"
					animate={{ width: sidebarWidth }}
					transition={isDragging ? { duration: 0 } : SPRING}
				>
					<AnimatePresence>
						{!collapsed && (
							<motion.div
								className="overflow-y-auto min-h-0 px-2 pl-8 pb-4"
								style={{
									width:
										lastOpenWidthRef.current ||
										DEFAULT_WIDTH,
									minWidth:
										lastOpenWidthRef.current ||
										DEFAULT_WIDTH,
								}}
								initial={{ opacity: 0 }}
								animate={{ opacity: 1 }}
								exit={{ opacity: 0 }}
								transition={{ duration: 0.15 }}
							>
								{sidebar}
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>
			) : (
				<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
					<SheetContent
						side={
							sidebarMode === "bottomSheet"
								? "bottom"
								: "right"
						}
						title="Repository details"
						className="flex flex-col gap-0 p-0 max-h-[75dvh] sm:max-h-none sm:w-[22rem]"
						showCloseButton={false}
					>
						<div className="shrink-0 border-b border-border/60 px-4 py-3">
							<div className="flex items-center justify-between gap-3">
								<span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60">
									About Repo
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
							{sidebar}
						</div>
					</SheetContent>
				</Sheet>
			)}

			{/* Floating expand button (collapsed state) */}
			<AnimatePresence>
				{isPersistentSidebar && collapsed && !isDragging && (
					<motion.div
						className="fixed top-0 bottom-0 left-0 z-50 w-8 group/expand"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.2, delay: 0.1 }}
					>
						<button
							type="button"
							onClick={handleExpand}
							className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md border bg-background shadow-sm cursor-pointer opacity-0 group-hover/expand:opacity-100 text-muted-foreground/60 hover:!text-foreground hover:!bg-muted transition-all duration-200"
							title="Show sidebar"
						>
							<PanelLeft className="w-3.5 h-3.5" />
						</button>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Resize handle + collapse button (expanded state) */}
			<AnimatePresence>
				{isPersistentSidebar && !collapsed && (
					<motion.div
						className="shrink-0 flex flex-col items-center"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						transition={{ duration: 0.15 }}
					>
						<div
							onMouseDown={handleDragStart}
							className="flex-1 w-1 cursor-col-resize flex items-center justify-center hover:bg-foreground/10 active:bg-foreground/15 transition-colors group/resize"
						>
							<div className="w-[2px] h-8 rounded-full bg-border group-hover/resize:bg-foreground/20 group-active/resize:bg-foreground/30 transition-colors" />
						</div>
						<button
							type="button"
							onClick={handleCollapse}
							className="flex items-center justify-center w-5 h-5 shrink-0 mb-1 rounded text-muted-foreground/0 hover:text-muted-foreground hover:bg-muted/50 cursor-pointer transition-all duration-150"
							title="Hide sidebar"
						>
							<PanelLeft className="w-3.5 h-3.5" />
						</button>
					</motion.div>
				)}
			</AnimatePresence>

			{/* Main content */}
			<div
				className="flex-1 min-w-0 flex flex-col min-h-0"
				style={contentInsetStyle}
			>
				{compactRepoHeader}
				{children}
			</div>

			{/* Portal breadcrumb to repo nav when sidebar collapsed */}
			{isPersistentSidebar &&
				collapsed &&
				repoNavSlot &&
				createPortal(
					<div className="flex shrink-0 items-center gap-1.5">
						<RepoBreadcrumb
							owner={owner}
							repoName={repo}
							ownerType={ownerType}
							ownerAvatarUrl={ownerAvatarUrl}
						/>
					</div>,
					repoNavSlot,
				)}
		</div>
	);
}
