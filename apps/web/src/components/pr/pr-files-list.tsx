import { cn } from "@/lib/utils";

interface ChangedFile {
	filename: string;
	status: string;
	additions: number;
	deletions: number;
	changes: number;
}

export function PRFilesList({ files }: { files: ChangedFile[] }) {
	const totalAdditions = files.reduce((s, f) => s + f.additions, 0);
	const totalDeletions = files.reduce((s, f) => s + f.deletions, 0);

	return (
		<div className="border border-border">
			<div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/30 dark:bg-white/[0.02]">
				<span className="text-[11px] font-mono text-muted-foreground">
					{files.length} file{files.length !== 1 ? "s" : ""} changed
				</span>
				<span className="text-[11px] font-mono text-success">
					+{totalAdditions}
				</span>
				<span className="text-[11px] font-mono text-destructive">
					-{totalDeletions}
				</span>
			</div>
			<div className="divide-y divide-border">
				{files.map((file) => {
					const total = file.additions + file.deletions;
					const addWidth =
						total > 0 ? (file.additions / total) * 100 : 0;

					return (
						<div
							key={file.filename}
							className="flex items-center gap-3 px-4 py-1.5"
						>
							<StatusDot status={file.status} />
							<span className="text-xs font-mono truncate flex-1 min-w-0">
								{file.filename}
							</span>
							<div className="flex items-center gap-2 shrink-0">
								<span className="text-[11px] font-mono text-success">
									+{file.additions}
								</span>
								<span className="text-[11px] font-mono text-destructive">
									-{file.deletions}
								</span>
								{total > 0 && (
									<div className="w-12 h-1.5 bg-muted overflow-hidden">
										<div
											className="h-full bg-success"
											style={{
												width: `${addWidth}%`,
											}}
										/>
									</div>
								)}
							</div>
						</div>
					);
				})}
			</div>
		</div>
	);
}

function StatusDot({ status }: { status: string }) {
	const colors: Record<string, string> = {
		added: "bg-success",
		removed: "bg-destructive",
		modified: "bg-warning",
		renamed: "bg-info",
		copied: "bg-info",
	};

	return (
		<span
			className={cn(
				"w-1.5 h-1.5 rounded-full shrink-0",
				colors[status] || "bg-muted-foreground",
			)}
		/>
	);
}
