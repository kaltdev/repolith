"use client";

import { useState, useEffect, useRef } from "react";
import { Loader2, X, ArrowLeft, ArrowLeftRight } from "lucide-react";
import { RunComparisonDiff } from "./run-comparison-diff";
import { RunComparisonTimeline } from "./run-comparison-timeline";
import type { ComparisonRun } from "./run-comparison";

export function RunComparisonInline({
	owner,
	repo,
	runIds,
	onClose,
}: {
	owner: string;
	repo: string;
	runIds: number[];
	onClose: () => void;
}) {
	const [data, setData] = useState<ComparisonRun[] | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const pushedUrl = useRef(false);

	// Push compare URL
	useEffect(() => {
		if (pushedUrl.current) return;
		pushedUrl.current = true;
		const compareUrl = `/${owner}/${repo}/actions/compare?run_ids=${runIds.join(",")}`;
		window.history.pushState({ compareInline: true }, "", compareUrl);
	}, [owner, repo, runIds]);

	useEffect(() => {
		const params = new URLSearchParams({ owner, repo });
		runIds.forEach((id) => params.append("run_ids", String(id)));
		fetch(`/api/compare-runs?${params}`)
			.then(async (res) => {
				if (!res.ok) {
					const body = await res.json().catch(() => ({}));
					throw new Error(
						body.error || "Failed to fetch comparison data",
					);
				}
				return res.json();
			})
			.then((json) => setData(json.runs))
			.catch((e) => setError(e.message))
			.finally(() => setLoading(false));
	}, [owner, repo, runIds]);

	// Close on browser back
	useEffect(() => {
		const onPopState = () => onClose();
		window.addEventListener("popstate", onPopState);
		return () => window.removeEventListener("popstate", onPopState);
	}, [onClose]);

	function handleBack() {
		if (window.history.state?.compareInline) {
			window.history.back();
		}
		onClose();
	}

	return (
		<div>
			{/* Sticky header */}
			<div className="sticky -top-2 z-10 bg-background pb-2">
				<button
					onClick={handleBack}
					className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors mb-1.5 cursor-pointer"
				>
					<ArrowLeft className="w-3 h-3" />
					All runs
				</button>
				<div className="flex items-center gap-3 pb-2 border-b border-border/40">
					<ArrowLeftRight className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
					<h1 className="text-sm font-medium">Comparing runs</h1>
					<span className="text-[10px] font-mono px-1.5 py-0.5 bg-muted/50 text-muted-foreground/50 tabular-nums">
						{runIds.length} runs
					</span>
					<span className="text-[10px] font-mono text-muted-foreground/30">
						{runIds.map((id) => `#${id}`).join(" vs ")}
					</span>
				</div>
			</div>

			{loading && (
				<div className="flex flex-col items-center justify-center py-20 gap-3">
					<Loader2 className="w-5 h-5 text-muted-foreground/30 animate-spin" />
					<span className="text-[11px] font-mono text-muted-foreground/25">
						Loading run data...
					</span>
				</div>
			)}
			{error && (
				<div className="flex flex-col items-center justify-center py-20 gap-2">
					<div className="w-8 h-8 flex items-center justify-center border border-destructive/20 bg-destructive/5">
						<X className="w-4 h-4 text-destructive/60" />
					</div>
					<p className="text-[12px] font-mono text-destructive/80">
						{error}
					</p>
				</div>
			)}
			{data && data.length === 2 && (
				<RunComparisonDiff
					runs={data as [ComparisonRun, ComparisonRun]}
					owner={owner}
					repo={repo}
				/>
			)}
			{data && data.length > 2 && (
				<RunComparisonTimeline runs={data} owner={owner} repo={repo} />
			)}
		</div>
	);
}
