"use client";

// Renders the save-search action for the search results surface.

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useSavedSearches } from "@/hooks/use-saved-searches";
import type { SavedSearchScope } from "@/types/dashboard";

export function SaveSearchButton({ query, scope }: { query: string; scope: SavedSearchScope }) {
	const { canSave, limitReached, createSavedSearch } = useSavedSearches();
	const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

	return (
		<div className="flex items-center gap-2">
			<Button
				type="button"
				variant="outline"
				size="sm"
				disabled={!canSave || !query.trim()}
				onClick={async () => {
					try {
						await createSavedSearch({
							label: query.trim(),
							query: query.trim(),
							scope,
						});
						setStatus("saved");
					} catch {
						setStatus("error");
					}
				}}
			>
				Save this search
			</Button>
			{limitReached ? (
				<span className="text-xs text-muted-foreground">Limit reached</span>
			) : status === "saved" ? (
				<span className="text-xs text-muted-foreground">Saved</span>
			) : status === "error" ? (
				<span className="text-xs text-destructive">Save failed</span>
			) : null}
		</div>
	);
}
