"use client";

import type { ReactNode, RefObject } from "react";
import { Search, ArrowUpDown, Filter, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* ── OpenClosedToggle ── */
export function OpenClosedToggle({
	state,
	counts,
	icons,
	onStateChange,
}: {
	state: "open" | "closed";
	counts: { open: number; closed: number };
	icons: { open: ReactNode; closed: ReactNode };
	onStateChange: (s: "open" | "closed") => void;
}) {
	return (
		<div className="flex items-center border border-border divide-x divide-border">
			{(
				[
					["open", counts.open, icons.open],
					["closed", counts.closed, icons.closed],
				] as const
			).map(([s, count, icon]) => (
				<button
					key={s}
					onClick={() => onStateChange(s as "open" | "closed")}
					className={cn(
						"flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider transition-colors cursor-pointer",
						state === s
							? "bg-muted/50 dark:bg-white/4 text-foreground"
							: "text-muted-foreground hover:text-foreground/60 hover:bg-muted/60 dark:hover:bg-white/3",
					)}
				>
					{icon}
					{s}
					<span
						className={cn(
							"text-[9px] px-1.5 py-0.5 border",
							state === s
								? "border-border text-foreground/60"
								: "border-border text-muted-foreground/50",
						)}
					>
						{count}
					</span>
				</button>
			))}
		</div>
	);
}

/* ── SortCycleButton ── */
export function SortCycleButton<S extends string>({
	sort,
	cycle,
	labels,
	onSort,
}: {
	sort: S;
	cycle: S[];
	labels: Record<S, string>;
	onSort: (s: S) => void;
}) {
	return (
		<button
			onClick={() => onSort(cycle[(cycle.indexOf(sort) + 1) % cycle.length])}
			className="flex items-center gap-1.5 h-9 px-3 text-[11px] font-mono uppercase tracking-wider text-muted-foreground border border-border rounded-md hover:text-foreground/60 hover:bg-muted/60 dark:hover:bg-white/3 transition-colors cursor-pointer"
		>
			<ArrowUpDown className="w-3 h-3" />
			{labels[sort]}
		</button>
	);
}

/* ── FiltersButton ── */
export function FiltersButton({
	open,
	activeCount,
	onToggle,
}: {
	open: boolean;
	activeCount: number;
	onToggle: () => void;
}) {
	return (
		<button
			onClick={onToggle}
			className={cn(
				"flex items-center gap-1.5 h-9 px-3 text-[11px] font-mono uppercase tracking-wider border rounded-md transition-colors cursor-pointer",
				open || activeCount > 0
					? "border-foreground/30 bg-muted/50 dark:bg-white/4 text-foreground"
					: "border-border text-muted-foreground hover:text-foreground/60 hover:bg-muted/60 dark:hover:bg-white/3",
			)}
		>
			<Filter className="w-3 h-3" />
			Filters
			{activeCount > 0 && (
				<span className="text-[9px] px-1.5 py-0.5 border border-foreground/20 bg-foreground/5 text-foreground">
					{activeCount}
				</span>
			)}
		</button>
	);
}

/* ── ClearFiltersButton ── */
export function ClearFiltersButton({ show, onClear }: { show: boolean; onClear: () => void }) {
	if (!show) return null;
	return (
		<button
			onClick={onClear}
			className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground/60 transition-colors cursor-pointer"
		>
			<X className="w-3 h-3" />
			Clear
		</button>
	);
}

/* ── ListSearchInput ── */
export function ListSearchInput({
	placeholder,
	value,
	onChange,
}: {
	placeholder: string;
	value: string;
	onChange: (v: string) => void;
}) {
	return (
		<div className="relative flex-1 max-w-sm">
			<Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/70" />
			<input
				type="text"
				placeholder={placeholder}
				value={value}
				onChange={(e) => onChange(e.target.value)}
				className="w-full h-9 bg-transparent border border-border pl-9 pr-4 text-sm placeholder:text-muted-foreground/70 focus:outline-none focus:border-foreground/20 focus:ring-[3px] focus:ring-ring/50 transition-colors rounded-md"
			/>
		</div>
	);
}

/* ── InfiniteScrollSentinel ── */
export function InfiniteScrollSentinel({
	sentinelRef,
	hasMore,
	loadMore,
	remaining,
}: {
	sentinelRef: RefObject<HTMLDivElement | null>;
	hasMore: boolean;
	loadMore: () => void;
	remaining: number;
}) {
	if (!hasMore) return null;
	return (
		<div ref={sentinelRef} className="py-4 text-center">
			<button
				onClick={loadMore}
				className="text-[11px] font-mono text-muted-foreground hover:text-foreground/60 transition-colors cursor-pointer"
			>
				Load more ({remaining} remaining)
			</button>
		</div>
	);
}

/* ── LoadingOverlay ── */
export function LoadingOverlay({ show }: { show: boolean }) {
	if (!show) return null;
	return (
		<div className="absolute inset-0 z-10 flex items-center justify-center bg-background/60">
			<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
		</div>
	);
}
