export function LabelBadge({
	label,
	maxWidth,
}: {
	label: { name?: string; color?: string | null };
	maxWidth?: number;
}) {
	if (!label.name) return null;
	const color = label.color || "888";
	return (
		<span
			className="text-[9px] font-mono px-1.5 py-0.5 rounded-full shrink-0"
			style={{
				backgroundColor: `#${color}18`,
				color: `#${color}`,
				...(maxWidth
					? {
							maxWidth,
							overflow: "hidden",
							textOverflow: "ellipsis",
							whiteSpace: "nowrap" as const,
						}
					: {}),
			}}
		>
			{label.name}
		</span>
	);
}
