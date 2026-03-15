"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { PanelLeft, Copy, Check, Download, Monitor } from "lucide-react";
import { useResponsiveSurfaceContext } from "@/components/shared/responsive-surface-provider";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { type FileTreeNode } from "@/lib/file-tree";
import { parseRefAndPath } from "@/lib/github-utils";
import { getResponsiveSurfaceDecision } from "@/lib/responsive-surface-policy";
import { FileExplorerTree } from "./file-explorer-tree";
import { BranchSelector } from "./branch-selector";
import { BreadcrumbNav } from "./breadcrumb-nav";
import { cn } from "@/lib/utils";
import {
	revalidateBranches,
	revalidateTags,
} from "@/app/(app)/repos/[owner]/[repo]/readme-actions";

interface CodeContentWrapperProps {
	owner: string;
	repo: string;
	defaultBranch: string;
	tree: FileTreeNode[] | null;
	initialBranches?: { name: string }[] | null;
	initialTags?: { name: string }[] | null;
	children: React.ReactNode;
}

const SNAP_THRESHOLD = 100;
const DEFAULT_WIDTH = 240;

function CloneDownloadButtons({
	owner,
	repo,
	currentRef,
}: {
	owner: string;
	repo: string;
	currentRef: string;
}) {
	const [showClone, setShowClone] = useState(false);
	const [copied, setCopied] = useState(false);
	const [cloneProtocol, setCloneProtocol] = useState<"https" | "ssh">("https");

	const cloneUrl =
		cloneProtocol === "https"
			? `https://github.com/${owner}/${repo}.git`
			: `git@github.com:${owner}/${repo}.git`;

	const zipUrl = `https://github.com/${owner}/${repo}/archive/${currentRef}.zip`;

	function handleCopy() {
		navigator.clipboard.writeText(cloneUrl);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	}

	return (
		<div className="relative flex items-center sm:ml-auto">
			<div className="flex items-center rounded-md border border-border overflow-hidden divide-x divide-border">
				<button
					onClick={() => setShowClone(!showClone)}
					className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-white/5 transition-colors cursor-pointer"
				>
					<Copy className="w-3 h-3" />
					Clone
				</button>
				<a
					href={zipUrl}
					data-no-github-intercept
					className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-white/5 transition-colors"
				>
					<Download className="w-3 h-3" />
					ZIP
				</a>
			</div>

			{showClone && (
				<>
					<div
						className="fixed inset-0 z-40"
						onClick={() => setShowClone(false)}
					/>
					<div className="absolute right-0 top-full mt-2 w-80 z-50 rounded-lg border border-border bg-card/95 backdrop-blur-sm shadow-xl p-3.5 animate-in fade-in slide-in-from-top-1 duration-150">
						<div className="flex items-center gap-1 mb-3">
							<button
								onClick={() =>
									setCloneProtocol("https")
								}
								className={`flex-1 py-1.5 text-[10px] font-mono rounded-md border transition-colors cursor-pointer ${
									cloneProtocol === "https"
										? "bg-muted/60 dark:bg-white/10 border-border text-foreground"
										: "border-transparent text-muted-foreground/60 hover:text-muted-foreground"
								}`}
							>
								HTTPS
							</button>
							<button
								onClick={() =>
									setCloneProtocol("ssh")
								}
								className={`flex-1 py-1.5 text-[10px] font-mono rounded-md border transition-colors cursor-pointer ${
									cloneProtocol === "ssh"
										? "bg-muted/60 dark:bg-white/10 border-border text-foreground"
										: "border-transparent text-muted-foreground/60 hover:text-muted-foreground"
								}`}
							>
								SSH
							</button>
						</div>
						<p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 mb-2.5">
							Clone with {cloneProtocol.toUpperCase()}
						</p>
						<div className="flex items-center gap-1.5">
							<input
								readOnly
								value={cloneUrl}
								className="flex-1 bg-muted/30 dark:bg-white/5 text-xs font-mono px-2.5 py-2 rounded-md border border-border text-muted-foreground focus:outline-none select-all"
							/>
							<button
								onClick={handleCopy}
								className="shrink-0 px-2.5 py-2 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 dark:hover:bg-white/5 transition-colors cursor-pointer"
							>
								{copied ? (
									<Check className="w-3.5 h-3.5 text-success" />
								) : (
									<Copy className="w-3.5 h-3.5" />
								)}
							</button>
						</div>
						<a
							href={`x-github-client://openRepo/https://github.com/${owner}/${repo}`}
							className="mt-3 pt-3 border-t border-border flex items-center gap-2 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
						>
							<Monitor className="w-3.5 h-3.5" />
							Open with GitHub Desktop
						</a>
					</div>
				</>
			)}
		</div>
	);
}

export function CodeContentWrapper({
	owner,
	repo,
	defaultBranch,
	tree,
	initialBranches,
	initialTags,
	children,
}: CodeContentWrapperProps) {
	const pathname = usePathname();
	const { width } = useResponsiveSurfaceContext();
	const base = `/${owner}/${repo}`;

	const isCodeRoute =
		pathname === `${base}/code` ||
		pathname.startsWith(`${base}/tree`) ||
		pathname.startsWith(`${base}/blob`);

	const { data: branches = [] } = useQuery({
		queryKey: ["repo-branches", owner, repo],
		queryFn: async () => (await revalidateBranches(owner, repo)) ?? [],
		initialData: initialBranches ?? undefined,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		enabled: isCodeRoute,
	});

	const { data: tags = [] } = useQuery({
		queryKey: ["repo-tags", owner, repo],
		queryFn: async () => (await revalidateTags(owner, repo)) ?? [],
		initialData: initialTags ?? undefined,
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		enabled: isCodeRoute,
	});

	// Detail routes (e.g. /pulls/123, /issues/5, /people/username) manage their own scrolling
	// Note: /pull/ (singular) comes from GitHub-style URLs rewritten by next.config.ts
	const isDetailRoute =
		/\/pulls?\/\d+/.test(pathname) ||
		/\/issues\/\d+/.test(pathname) ||
		/\/people\/[^/]+$/.test(pathname);

	// Overview route: page frame stays fixed, only content sections scroll (lg only)
	const isOverviewRoute = pathname === base;

	const showTree = isCodeRoute && tree !== null;

	const isBlobOrTree =
		pathname.startsWith(`${base}/blob`) || pathname.startsWith(`${base}/tree`);
	const routeKind = pathname.startsWith(`${base}/blob`) ? "repoDocument" : "repoCode";
	const explorerDecision = getResponsiveSurfaceDecision({
		routeKind,
		surfaceId: "fileExplorer",
		viewportWidth: width,
	});
	const explorerMode = explorerDecision.mode === "persistent" ? "persistent" : "leftSheet";
	const isPersistentExplorer = showTree && explorerMode === "persistent";

	// Parse ref and path from URL for blob/tree routes
	const { currentRef, currentPath, pathType } = useMemo(() => {
		if (!isBlobOrTree) {
			return {
				currentRef: defaultBranch,
				currentPath: "",
				pathType: "tree" as const,
			};
		}

		const blobPrefix = `${base}/blob/`;
		const treePrefix = `${base}/tree/`;
		let rawPath: string;
		let type: "blob" | "tree";

		if (pathname.startsWith(blobPrefix)) {
			rawPath = decodeURIComponent(pathname.slice(blobPrefix.length));
			type = "blob";
		} else {
			rawPath = decodeURIComponent(pathname.slice(treePrefix.length));
			type = "tree";
		}

		const segments = rawPath.split("/").filter(Boolean);
		const branchNames = [...branches.map((b) => b.name), ...tags.map((t) => t.name)];
		const { ref, path } = parseRefAndPath(segments, branchNames);

		return { currentRef: ref, currentPath: path, pathType: type };
	}, [pathname, base, isBlobOrTree, branches, tags, defaultBranch]);

	const [sidebarWidth, setSidebarWidth] = useState(DEFAULT_WIDTH);
	const [sheetOpen, setSheetOpen] = useState(false);
	const lastOpenWidthRef = useRef(DEFAULT_WIDTH);
	const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);
	const previousModeRef = useRef<"leftSheet" | "persistent" | null>(null);

	const collapsed = sidebarWidth === 0;

	useEffect(() => {
		if (!showTree) {
			setSheetOpen(false);
			previousModeRef.current = null;
			return;
		}

		const previousMode = previousModeRef.current;

		if (previousMode === null) {
			previousModeRef.current = explorerMode;
			return;
		}

		if (previousMode === explorerMode) return;

		if (previousMode === "persistent" && sidebarWidth > 0) {
			setSheetOpen(true);
		}

		if (explorerMode === "persistent" && sheetOpen) {
			setSidebarWidth(lastOpenWidthRef.current || DEFAULT_WIDTH);
			setSheetOpen(false);
		}

		previousModeRef.current = explorerMode;
	}, [explorerMode, sheetOpen, showTree, sidebarWidth]);

	const handleDragStart = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			const startWidth = sidebarWidth;
			dragRef.current = { startX: e.clientX, startWidth };
			const onMove = (ev: MouseEvent) => {
				if (!dragRef.current) return;
				const delta = ev.clientX - dragRef.current.startX;
				const raw = dragRef.current.startWidth + delta;
				// Snap to closed below threshold, otherwise clamp between 160-480
				if (raw < SNAP_THRESHOLD) {
					setSidebarWidth(0);
				} else {
					const clamped = Math.max(160, Math.min(480, raw));
					setSidebarWidth(clamped);
				}
			};
			const onUp = () => {
				dragRef.current = null;
				document.removeEventListener("mousemove", onMove);
				document.removeEventListener("mouseup", onUp);
				document.body.style.userSelect = "";
				document.body.style.cursor = "";
				// Save last open width for restore
				setSidebarWidth((w) => {
					if (w > 0) lastOpenWidthRef.current = w;
					return w;
				});
			};
			document.addEventListener("mousemove", onMove);
			document.addEventListener("mouseup", onUp);
			document.body.style.userSelect = "none";
			document.body.style.cursor = "col-resize";
		},
		[sidebarWidth],
	);

	const handleExpand = useCallback(() => {
		if (!isPersistentExplorer) {
			setSheetOpen(true);
			return;
		}
		setSidebarWidth(lastOpenWidthRef.current || DEFAULT_WIDTH);
	}, [isPersistentExplorer]);

	const handleCloseExplorer = useCallback(() => {
		if (isPersistentExplorer) {
			setSidebarWidth(0);
			return;
		}
		setSheetOpen(false);
	}, [isPersistentExplorer]);

	return (
		<div className="flex flex-1 min-h-0">
			{showTree && (
				<>
					{/* Collapsed toggle */}
					{isPersistentExplorer && collapsed && (
						<div className="shrink-0 flex flex-col items-center pt-2 pl-4 pr-0.5">
							<button
								type="button"
								onClick={handleExpand}
								className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
								title="Show file explorer"
							>
								<PanelLeft className="w-4 h-4" />
							</button>
						</div>
					)}

					{/* Sidebar */}
					{isPersistentExplorer && !collapsed && (
						<div
							className="flex shrink-0 flex-col overflow-hidden border-r border-border pl-4 min-h-0"
							style={{ width: sidebarWidth }}
						>
							<FileExplorerTree
								tree={tree}
								owner={owner}
								repo={repo}
								defaultBranch={defaultBranch}
							/>
						</div>
					)}

					{/* Drag handle — only when open */}
					{isPersistentExplorer && !collapsed && (
						<div
							onMouseDown={handleDragStart}
							className="flex w-1 shrink-0 cursor-col-resize items-center justify-center hover:bg-foreground/10 active:bg-foreground/15 transition-colors group"
						>
							<div className="w-[2px] h-8 rounded-full bg-border group-hover:bg-foreground/20 group-active:bg-foreground/30 transition-colors" />
						</div>
					)}

					{!isPersistentExplorer && (
						<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
							<SheetContent
								side="left"
								title="Files"
								className="w-[min(88vw,22rem)] max-w-[22rem] gap-0 p-0"
								showCloseButton={false}
							>
								<div className="shrink-0 border-b border-border/60 px-4 py-3">
									<div className="flex items-center justify-between gap-3">
										<span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/60">
											Files
										</span>
										<button
											type="button"
											onClick={
												handleCloseExplorer
											}
											className="rounded-md px-2 py-1 text-[11px] font-mono text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors cursor-pointer"
										>
											Close
										</button>
									</div>
								</div>
								<div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
									<FileExplorerTree
										tree={tree}
										owner={owner}
										repo={repo}
										defaultBranch={
											defaultBranch
										}
									/>
								</div>
							</SheetContent>
						</Sheet>
					)}
				</>
			)}
			<div className="flex-1 min-w-0 flex flex-col min-h-0">
				{showTree && !isBlobOrTree && !isPersistentExplorer && (
					<div
						className="shrink-0 px-4 pt-3 pb-2"
						style={{ paddingRight: "var(--repo-pr, 1rem)" }}
					>
						<button
							type="button"
							onClick={handleExpand}
							className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[11px] font-mono text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors cursor-pointer"
						>
							<PanelLeft className="w-3.5 h-3.5" />
							Files
						</button>
					</div>
				)}
				{isBlobOrTree && (
					<div
						className="shrink-0 flex flex-wrap items-center gap-3 pl-4 pt-3 pb-3"
						style={{ paddingRight: "var(--repo-pr, 1rem)" }}
					>
						{showTree && !isPersistentExplorer && (
							<button
								type="button"
								onClick={handleExpand}
								className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-[11px] font-mono text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors cursor-pointer"
							>
								<PanelLeft className="w-3.5 h-3.5" />
								Files
							</button>
						)}
						<BranchSelector
							owner={owner}
							repo={repo}
							currentRef={currentRef}
							branches={branches}
							tags={tags}
							currentPath={currentPath}
							pathType={pathType}
						/>
						<BreadcrumbNav
							owner={owner}
							repo={repo}
							currentRef={currentRef}
							path={currentPath}
							isFile={pathType === "blob"}
						/>
						<CloneDownloadButtons
							owner={owner}
							repo={repo}
							currentRef={currentRef}
						/>
					</div>
				)}
				<div
					data-scroll-container
					className={cn(
						"flex-1 min-h-0",
						isDetailRoute
							? "flex flex-col overflow-hidden pl-4 mx-4"
							: isOverviewRoute
								? "flex flex-col overflow-y-auto pl-4 pb-4 pt-3 mx-4"
								: cn(
										"overflow-y-auto pl-4 pb-4",
										isBlobOrTree
											? ""
											: "pt-3",
									),
					)}
					style={{
						paddingRight:
							"var(--repo-pr, calc(var(--spacing) * 4))",
					}}
				>
					{children}
				</div>
			</div>
		</div>
	);
}
