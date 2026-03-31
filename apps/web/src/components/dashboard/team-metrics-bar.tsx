"use client";

// Renders the Team dashboard summary metrics strip.

import type { TeamDashboardMetrics } from "@/types/dashboard";

function TeamMetricSkeleton() {
	return <div className="h-20 rounded-md border border-border bg-muted/30 animate-pulse" />;
}

export function TeamMetricsBar({ metrics }: { metrics: TeamDashboardMetrics | null }) {
	if (!metrics) {
		return (
			<div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
				{Array.from({ length: 6 }).map((_, index) => (
					<TeamMetricSkeleton key={index} />
				))}
			</div>
		);
	}

	const items = [
		{ label: "PRs Opened", value: metrics.prsOpened },
		{ label: "PRs Merged", value: metrics.prsMerged },
		{ label: "PRs Closed", value: metrics.prsClosed },
		{ label: "Issues Opened", value: metrics.issuesOpened },
		{ label: "Issues Closed", value: metrics.issuesClosed },
		{
			label: "Avg Review Hours",
			value: Number.isFinite(metrics.avgPrReviewTurnaroundHours)
				? metrics.avgPrReviewTurnaroundHours.toFixed(1)
				: "0.0",
		},
	];

	return (
		<div className="grid grid-cols-2 gap-3 xl:grid-cols-6">
			{items.map((item) => (
				<div
					key={item.label}
					className="rounded-md border border-border px-4 py-3"
				>
					<p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
						{item.label}
					</p>
					<p className="mt-2 text-xl font-medium tracking-tight">
						{item.value}
					</p>
				</div>
			))}
		</div>
	);
}
