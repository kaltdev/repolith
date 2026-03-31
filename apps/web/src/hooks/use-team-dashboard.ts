"use client";

// Owns Team dashboard view/org selection state and local persistence.

import { useEffect, useMemo } from "react";
import { parseAsString, useQueryState } from "nuqs";
import type { TeamDashboardData, TeamDashboardSelection } from "@/types/dashboard";

const TEAM_SELECTION_STORAGE_KEY = "dashboard_team_selection";

type TeamDashboardStorage = Pick<Storage, "getItem" | "setItem">;

export function normalizeTeamDashboardSelection(
	value: Partial<TeamDashboardSelection> | null | undefined,
	allowedOrgs: string[],
	fallback: TeamDashboardSelection,
): TeamDashboardSelection {
	const nextOrg =
		typeof value?.org === "string" && allowedOrgs.includes(value.org)
			? value.org
			: fallback.org;
	const nextTeam = typeof value?.team === "string" ? value.team : fallback.team;

	return {
		org: nextOrg,
		team: nextTeam,
	};
}

export function readTeamDashboardSelection(
	storage: TeamDashboardStorage,
	allowedOrgs: string[],
	fallback: TeamDashboardSelection,
): TeamDashboardSelection {
	const raw = storage.getItem(TEAM_SELECTION_STORAGE_KEY);
	if (!raw) {
		return fallback;
	}

	try {
		return normalizeTeamDashboardSelection(
			JSON.parse(raw) as Partial<TeamDashboardSelection>,
			allowedOrgs,
			fallback,
		);
	} catch {
		return fallback;
	}
}

export function writeTeamDashboardSelection(
	storage: TeamDashboardStorage,
	selection: TeamDashboardSelection,
) {
	storage.setItem(TEAM_SELECTION_STORAGE_KEY, JSON.stringify(selection));
}

export function useTeamDashboard(initialData: TeamDashboardData | null) {
	const allowedOrgs = useMemo(
		() => initialData?.orgs.map((org) => org.login) ?? [],
		[initialData],
	);
	const fallbackSelection = useMemo(
		() =>
			({
				org: initialData?.selectedOrg ?? "",
				team: initialData?.selectedTeam ?? "",
			}) satisfies TeamDashboardSelection,
		[initialData],
	);
	const [selectedOrg, setSelectedOrg] = useQueryState(
		"org",
		parseAsString.withDefault(fallbackSelection.org).withOptions({ shallow: false }),
	);
	const [selectedTeam, setSelectedTeam] = useQueryState(
		"team",
		parseAsString.withDefault(fallbackSelection.team),
	);

	useEffect(() => {
		if (typeof window === "undefined" || !initialData?.orgs.length) return;
		const urlSearchParams = new URLSearchParams(window.location.search);
		if (urlSearchParams.has("org") || urlSearchParams.has("team")) return;

		const persisted = readTeamDashboardSelection(
			window.localStorage,
			allowedOrgs,
			fallbackSelection,
		);

		if (persisted.org !== selectedOrg) {
			void setSelectedOrg(persisted.org || null);
		}
		if (persisted.team !== selectedTeam) {
			void setSelectedTeam(persisted.team || null);
		}
	}, [
		allowedOrgs,
		fallbackSelection,
		initialData?.orgs.length,
		selectedOrg,
		selectedTeam,
		setSelectedOrg,
		setSelectedTeam,
	]);

	useEffect(() => {
		if (typeof window === "undefined") return;
		writeTeamDashboardSelection(window.localStorage, {
			org: selectedOrg,
			team: selectedTeam,
		});
	}, [selectedOrg, selectedTeam]);

	return {
		selectedOrg,
		selectedTeam,
		setSelectedOrg,
		setSelectedTeam,
		data: initialData,
		hasOrganizations: (initialData?.orgs.length ?? 0) > 0,
		hasTeamOptions: false,
	};
}
