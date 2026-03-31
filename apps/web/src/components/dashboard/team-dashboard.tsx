"use client";

// Composes the org-scoped Team dashboard using server-fetched initial data.

import { TeamActivityFeed } from "./team-activity-feed";
import { TeamMetricsBar } from "./team-metrics-bar";
import { OpenPRsPanel } from "./open-prs-panel";
import { TopContributors } from "./top-contributors";
import { TeamSelector } from "./team-selector";
import { useTeamDashboard } from "@/hooks/use-team-dashboard";
import type { TeamDashboardData } from "@/types/dashboard";

export function TeamDashboard({ initialData }: { initialData: TeamDashboardData | null }) {
	const { data, selectedOrg, selectedTeam, setSelectedOrg, hasOrganizations } =
		useTeamDashboard(initialData);

	if (!hasOrganizations || !data) {
		return (
			<div className="rounded-md border border-border px-4 py-10 text-center text-sm text-muted-foreground">
				Team dashboard is unavailable because this account does not belong
				to an organization.
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<TeamSelector
				orgs={data.orgs}
				selectedOrg={selectedOrg}
				selectedTeam={selectedTeam}
				onOrgChange={setSelectedOrg}
			/>
			<TeamMetricsBar metrics={data.metrics} />
			<div className="grid grid-cols-1 gap-3 xl:grid-cols-[1.4fr_1fr]">
				<TeamActivityFeed activity={data.activity} />
				<div className="space-y-3">
					<OpenPRsPanel items={data.openPrs} />
					<TopContributors items={data.contributors} />
				</div>
			</div>
		</div>
	);
}
