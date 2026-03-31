"use client";

// Renders the dashboard saved-searches widget using the saved-search hook.

import { Badge } from "@/components/ui/badge";
import { useSavedSearches } from "@/hooks/use-saved-searches";
import { SavedSearchItem } from "./saved-search-item";

function SavedSearchesSkeleton() {
	return (
		<div className="space-y-2 p-3">
			{Array.from({ length: 3 }).map((_, index) => (
				<div
					key={index}
					className="h-20 animate-pulse rounded-md border border-border bg-muted/30"
				/>
			))}
		</div>
	);
}

export function SavedSearchesWidget() {
	const {
		savedSearches,
		isLoading,
		isSyncPending,
		limitReached,
		renameSavedSearch,
		deleteSavedSearch,
		markUsed,
	} = useSavedSearches();

	if (isLoading) {
		return <SavedSearchesSkeleton />;
	}

	return (
		<div className="space-y-3 p-3">
			<div className="flex flex-wrap items-center gap-2">
				{isSyncPending ? (
					<Badge variant="outline" className="text-[10px]">
						Sync pending
					</Badge>
				) : null}
				{limitReached ? (
					<p className="text-xs text-muted-foreground">
						Saved search limit reached.
					</p>
				) : null}
			</div>

			{savedSearches.length > 0 ? (
				<div className="space-y-2">
					{savedSearches.map((item) => (
						<SavedSearchItem
							key={item.id}
							item={item}
							onRename={renameSavedSearch}
							onDelete={deleteSavedSearch}
							onOpen={markUsed}
						/>
					))}
				</div>
			) : (
				<div className="rounded-md border border-border px-4 py-8 text-center">
					<p className="text-sm text-muted-foreground">
						No saved searches yet.
					</p>
					<p className="mt-1 text-xs text-muted-foreground/70">
						Save a search from the search page to pin it here.
					</p>
				</div>
			)}
		</div>
	);
}
