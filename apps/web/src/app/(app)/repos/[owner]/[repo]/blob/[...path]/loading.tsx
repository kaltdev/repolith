export default function BlobLoading() {
	return (
		<div className="animate-pulse">
			{/* Code viewer */}
			<div className="border border-border rounded-md overflow-hidden">
				{/* File header */}
				<div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-muted/20">
					<div className="h-3 w-40 rounded bg-muted/40" />
					<div className="flex items-center gap-2 ml-auto">
						<div className="h-3 w-12 rounded bg-muted/25" />
						<div className="h-3 w-16 rounded bg-muted/25" />
					</div>
				</div>

				{/* Code lines */}
				<div className="space-y-0">
					{Array.from({ length: 30 }).map((_, i) => (
						<div key={i} className="flex items-center h-5">
							<div className="w-12 h-full flex items-center justify-end pr-3">
								<div className="h-2.5 w-4 rounded bg-muted/15" />
							</div>
							<div
								className="h-3 rounded bg-muted/15 ml-2"
								style={{
									width: `${20 + Math.random() * 400}px`,
									marginLeft: `${(i % 4) * 16 + 8}px`,
								}}
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
