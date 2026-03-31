"use client";

// Renders the activity filter controls that sit above the dashboard activity list.

import { Button } from "@/components/ui/button";
import {
	Combobox,
	ComboboxContent,
	ComboboxEmpty,
	ComboboxInput,
	ComboboxItem,
	ComboboxList,
} from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
	ACTIVITY_EVENT_TYPES,
	ACTIVITY_RANGE_PRESETS,
	type ActivityEventType,
	type ActivityFilters,
	type ActivityRangePreset,
} from "@/types/dashboard";
import { ActivityFilterChip } from "./activity-filter-chip";
import type { ActivityFilterChipModel } from "@/hooks/use-activity-filters";

const EVENT_TYPE_LABELS: Record<ActivityEventType, string> = {
	push: "Push",
	pull_request: "Pull request",
	issue: "Issue",
	review: "Review",
	comment: "Comment",
	release: "Release",
	fork: "Fork",
	star: "Star",
};

const RANGE_LABELS: Record<ActivityRangePreset, string> = {
	today: "Today",
	"7d": "Last 7 days",
	"30d": "Last 30 days",
	custom: "Custom range",
};

export function ActivityFilterBar({
	filters,
	repoOptions,
	activeChips,
	hasActiveFilters,
	onToggleEventType,
	onRepoChange,
	onRangeChange,
	onCustomRangeChange,
	onRemoveChip,
	onClearAll,
}: {
	filters: ActivityFilters;
	repoOptions: string[];
	activeChips: ActivityFilterChipModel[];
	hasActiveFilters: boolean;
	onToggleEventType: (eventType: ActivityEventType) => void;
	onRepoChange: (repo: string) => void;
	onRangeChange: (range: ActivityRangePreset) => void;
	onCustomRangeChange: (from: string, to: string) => void;
	onRemoveChip: (chip: ActivityFilterChipModel) => void;
	onClearAll: () => void;
}) {
	return (
		<div className="space-y-3 border-b border-border px-4 py-3">
			<div className="flex flex-col gap-3 lg:flex-row lg:items-end">
				<div className="space-y-1.5">
					<p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
						Event type
					</p>
					<div className="flex flex-wrap gap-1.5">
						{ACTIVITY_EVENT_TYPES.map((eventType) => {
							const selected =
								filters.eventTypes.includes(
									eventType,
								);
							return (
								<Button
									key={eventType}
									type="button"
									variant={
										selected
											? "default"
											: "outline"
									}
									size="sm"
									className={cn(
										"h-8 px-3 text-[11px]",
										selected &&
											"shadow-xs",
									)}
									aria-pressed={selected}
									onClick={() =>
										onToggleEventType(
											eventType,
										)
									}
								>
									{
										EVENT_TYPE_LABELS[
											eventType
										]
									}
								</Button>
							);
						})}
					</div>
				</div>

				<div className="min-w-0 flex-1 space-y-1.5">
					<p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
						Repository
					</p>
					<Combobox
						value={filters.repo || null}
						onValueChange={(value) =>
							onRepoChange(String(value ?? ""))
						}
					>
						<ComboboxInput
							className="w-full"
							placeholder={
								repoOptions.length > 0
									? "Search repositories..."
									: "No repositories available"
							}
							disabled={repoOptions.length === 0}
							showClear={Boolean(filters.repo)}
						/>
						<ComboboxContent>
							<ComboboxList>
								{repoOptions.map((repo) => (
									<ComboboxItem
										key={repo}
										value={repo}
									>
										<span className="truncate">
											{repo}
										</span>
									</ComboboxItem>
								))}
								<ComboboxEmpty>
									No matching repositories
								</ComboboxEmpty>
							</ComboboxList>
						</ComboboxContent>
					</Combobox>
				</div>
			</div>

			<div className="space-y-1.5">
				<p className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
					Date range
				</p>
				<div className="flex flex-wrap gap-1.5">
					{ACTIVITY_RANGE_PRESETS.map((range) => {
						const selected =
							filters.range === range ||
							(range === "7d" &&
								filters.range === "7d" &&
								!filters.from &&
								!filters.to);
						return (
							<Button
								key={range}
								type="button"
								variant={
									selected
										? "default"
										: "outline"
								}
								size="sm"
								className={cn(
									"h-8 px-3 text-[11px]",
									selected && "shadow-xs",
								)}
								aria-pressed={selected}
								onClick={() => onRangeChange(range)}
							>
								{RANGE_LABELS[range]}
							</Button>
						);
					})}
				</div>
				{filters.range === "custom" && (
					<div className="grid gap-2 sm:grid-cols-2">
						<div className="space-y-1">
							<label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
								From
							</label>
							<Input
								type="date"
								value={filters.from}
								onChange={(event) =>
									onCustomRangeChange(
										event.target.value,
										filters.to,
									)
								}
								aria-label="Start date"
							/>
						</div>
						<div className="space-y-1">
							<label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
								To
							</label>
							<Input
								type="date"
								value={filters.to}
								onChange={(event) =>
									onCustomRangeChange(
										filters.from,
										event.target.value,
									)
								}
								aria-label="End date"
							/>
						</div>
					</div>
				)}
			</div>

			{hasActiveFilters && (
				<div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
					{activeChips.map((chip) => (
						<ActivityFilterChip
							key={`${chip.kind}:${chip.value}`}
							chip={chip}
							onRemove={() => onRemoveChip(chip)}
						/>
					))}
					<Button
						type="button"
						variant="link"
						size="sm"
						className="h-auto px-0 text-[11px]"
						onClick={onClearAll}
					>
						Clear all filters
					</Button>
				</div>
			)}
		</div>
	);
}
