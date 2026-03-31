// Verifies Team dashboard selection helpers without depending on DOM-specific test libraries.

import { describe, expect, it } from "vitest";
import {
	normalizeTeamDashboardSelection,
	readTeamDashboardSelection,
	writeTeamDashboardSelection,
} from "./use-team-dashboard";

function createStorage() {
	const state = new Map<string, string>();

	return {
		getItem(key: string) {
			return state.has(key) ? state.get(key)! : null;
		},
		setItem(key: string, value: string) {
			state.set(key, value);
		},
	};
}

describe("team dashboard selection helpers", () => {
	it("keeps persisted selections only when the org is still available", () => {
		expect(
			normalizeTeamDashboardSelection(
				{
					org: "acme",
					team: "platform",
				},
				["acme", "example"],
				{ org: "example", team: "" },
			),
		).toEqual({
			org: "acme",
			team: "platform",
		});
	});

	it("falls back when the stored org is no longer allowed", () => {
		expect(
			normalizeTeamDashboardSelection(
				{
					org: "legacy",
					team: "ops",
				},
				["acme"],
				{ org: "acme", team: "" },
			),
		).toEqual({
			org: "acme",
			team: "ops",
		});
	});

	it("reads and writes persisted selections", () => {
		const storage = createStorage();
		writeTeamDashboardSelection(storage, {
			org: "acme",
			team: "platform",
		});

		expect(
			readTeamDashboardSelection(storage, ["acme"], {
				org: "fallback",
				team: "",
			}),
		).toEqual({
			org: "acme",
			team: "platform",
		});
	});

	it("falls back when persisted data is invalid", () => {
		const storage = createStorage();
		storage.setItem("dashboard_team_selection", "{");

		expect(
			readTeamDashboardSelection(storage, ["acme"], {
				org: "acme",
				team: "",
			}),
		).toEqual({
			org: "acme",
			team: "",
		});
	});
});
