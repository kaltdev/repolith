"use client";

// Renders the Team dashboard org selector and the degraded all-members team selector.

import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
import type { TeamOrgOption } from "@/types/dashboard";

export function TeamSelector({
	orgs,
	selectedOrg,
	selectedTeam,
	onOrgChange,
}: {
	orgs: TeamOrgOption[];
	selectedOrg: string;
	selectedTeam: string;
	onOrgChange: (org: string) => void;
}) {
	return (
		<div className="grid gap-3 rounded-md border border-border p-3 lg:grid-cols-2">
			<div className="space-y-1.5">
				<p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
					Organization
				</p>
				<Combobox
					value={selectedOrg || null}
					onValueChange={(value) => onOrgChange(String(value ?? ""))}
				>
					<ComboboxInput
						className="w-full"
						placeholder="Choose an organization..."
					/>
					<ComboboxContent>
						<ComboboxList>
							{orgs.map((org) => (
								<ComboboxItem
									key={org.login}
									value={org.login}
								>
									{org.name || org.login}
								</ComboboxItem>
							))}
							<ComboboxEmpty>
								No organizations found
							</ComboboxEmpty>
						</ComboboxList>
					</ComboboxContent>
				</Combobox>
			</div>
			<div className="space-y-1.5">
				<p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
					Team
				</p>
				<div className="rounded-md border border-input bg-input/30 px-3 py-2 text-sm text-muted-foreground">
					{selectedTeam || "All members"}
				</div>
				<p className="text-[11px] text-muted-foreground/70">
					Team-specific data is unavailable because this repo does not
					expose an existing team-membership source.
				</p>
			</div>
		</div>
	);
}
