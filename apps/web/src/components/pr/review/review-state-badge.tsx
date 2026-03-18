export function ReviewStateBadge({ state }: { state: string }) {
	switch (state) {
		case "APPROVED":
			return (
				<span className="text-[9px] px-1.5 py-px rounded-full bg-success/10 text-success font-medium">
					Approved
				</span>
			);
		case "CHANGES_REQUESTED":
			return (
				<span className="text-[9px] px-1.5 py-px rounded-full bg-warning/10 text-warning font-medium">
					Changes
				</span>
			);
		case "COMMENTED":
			return (
				<span className="text-[9px] px-1.5 py-px rounded-full bg-info/10 text-info font-medium">
					Commented
				</span>
			);
		case "DISMISSED":
			return (
				<span className="text-[9px] px-1.5 py-px rounded-full bg-muted-foreground/10 text-muted-foreground/60 font-medium">
					Dismissed
				</span>
			);
		default:
			return null;
	}
}
