"use client";

// Renders a reusable inline comment composer for future dashboard card actions.

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function InlineCommentComposer({
	value,
	onChange,
	onSubmit,
	onCancel,
	submitting = false,
	placeholder = "Add a comment...",
	submitLabel = "Submit",
	cancelLabel = "Cancel",
	ariaLabel = "Inline comment composer",
}: {
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	onCancel: () => void;
	submitting?: boolean;
	placeholder?: string;
	submitLabel?: string;
	cancelLabel?: string;
	ariaLabel?: string;
}) {
	return (
		<div className="space-y-2 rounded-md border border-border bg-background p-3">
			<Textarea
				autoFocus
				value={value}
				onChange={(event) => onChange(event.target.value)}
				onKeyDown={(event) => {
					if (event.key === "Escape") {
						event.preventDefault();
						onCancel();
					}
					if (
						(event.metaKey || event.ctrlKey) &&
						event.key === "Enter"
					) {
						event.preventDefault();
						onSubmit();
					}
				}}
				placeholder={placeholder}
				aria-label={ariaLabel}
				rows={3}
			/>
			<div className="flex items-center justify-end gap-2">
				<Button
					type="button"
					variant="ghost"
					size="sm"
					onClick={onCancel}
					disabled={submitting}
				>
					{cancelLabel}
				</Button>
				<Button
					type="button"
					size="sm"
					onClick={onSubmit}
					disabled={submitting || !value.trim()}
				>
					{submitLabel}
				</Button>
			</div>
		</div>
	);
}
