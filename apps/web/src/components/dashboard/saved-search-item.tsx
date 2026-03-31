"use client";

// Renders one saved-search entry with inline rename, delete confirmation, and open behavior.

import Link from "next/link";
import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Popover,
	PopoverContent,
	PopoverDescription,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@/components/ui/popover";
import { TimeAgo } from "@/components/ui/time-ago";
import { buildSavedSearchHref } from "@/hooks/use-saved-searches";
import type { SavedSearchRecord } from "@/types/dashboard";

export function SavedSearchItem({
	item,
	onRename,
	onDelete,
	onOpen,
}: {
	item: SavedSearchRecord;
	onRename: (id: string, label: string) => Promise<void> | void;
	onDelete: (id: string) => Promise<void> | void;
	onOpen: (id: string) => Promise<void> | void;
}) {
	const [editing, setEditing] = useState(false);
	const [draftLabel, setDraftLabel] = useState(item.label);
	const [deleteOpen, setDeleteOpen] = useState(false);

	const href = buildSavedSearchHref(item.query, item.scope);

	async function commitRename() {
		const nextLabel = draftLabel.trim();
		setEditing(false);
		if (!nextLabel || nextLabel === item.label) {
			setDraftLabel(item.label);
			return;
		}
		await onRename(item.id, nextLabel);
	}

	return (
		<div className="rounded-md border border-border bg-background p-3">
			<div className="flex items-start gap-3">
				<div className="min-w-0 flex-1">
					{editing ? (
						<Input
							autoFocus
							value={draftLabel}
							onChange={(event) =>
								setDraftLabel(event.target.value)
							}
							onBlur={() => void commitRename()}
							onKeyDown={(event) => {
								if (event.key === "Enter") {
									event.preventDefault();
									void commitRename();
								}
								if (event.key === "Escape") {
									event.preventDefault();
									setDraftLabel(item.label);
									setEditing(false);
								}
							}}
							aria-label={`Rename ${item.label}`}
						/>
					) : (
						<div className="flex items-center gap-2">
							<Link
								href={href}
								onClick={() => void onOpen(item.id)}
								className="truncate text-sm font-medium hover:underline"
							>
								{item.label}
							</Link>
							{item.syncPending ? (
								<Badge
									variant="outline"
									className="text-[10px]"
								>
									Sync pending
								</Badge>
							) : null}
						</div>
					)}
					<p className="mt-1 truncate text-xs font-mono text-muted-foreground/70">
						{item.query}
					</p>
					<div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground/60">
						<Badge
							variant="outline"
							className="text-[10px] uppercase"
						>
							{item.scope}
						</Badge>
						<span>
							Last used <TimeAgo date={item.lastUsedAt} />
						</span>
					</div>
				</div>
				<div className="flex items-center gap-1">
					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label={`Rename ${item.label}`}
						onClick={() => setEditing(true)}
					>
						<Pencil className="size-4" />
					</Button>
					<Popover open={deleteOpen} onOpenChange={setDeleteOpen}>
						<PopoverTrigger asChild>
							<Button
								type="button"
								variant="ghost"
								size="icon"
								aria-label={`Delete ${item.label}`}
							>
								<Trash2 className="size-4" />
							</Button>
						</PopoverTrigger>
						<PopoverContent align="end">
							<PopoverHeader>
								<PopoverTitle>
									Delete saved search?
								</PopoverTitle>
								<PopoverDescription>
									This removes the shortcut
									from your dashboard.
								</PopoverDescription>
							</PopoverHeader>
							<div className="mt-3 flex justify-end gap-2">
								<Button
									type="button"
									size="sm"
									variant="outline"
									onClick={() =>
										setDeleteOpen(false)
									}
								>
									Cancel
								</Button>
								<Button
									type="button"
									size="sm"
									onClick={() => {
										setDeleteOpen(
											false,
										);
										void onDelete(
											item.id,
										);
									}}
								>
									Delete
								</Button>
							</div>
						</PopoverContent>
					</Popover>
				</div>
			</div>
		</div>
	);
}
