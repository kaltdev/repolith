"use client";

// Renders ranked org contributors from aggregated recent activity.

import { Badge } from "@/components/ui/badge";
import { GithubAvatar } from "@/components/shared/github-avatar";
import type { TeamContributorItem } from "@/types/dashboard";

export function TopContributors({ items }: { items: TeamContributorItem[] }) {
	return (
		<section className="rounded-md border border-border">
			<div className="border-b border-border px-4 py-2">
				<h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
					Top Contributors
				</h2>
			</div>
			<div>
				{items.length > 0 ? (
					items.map((item, index) => (
						<div
							key={item.login}
							className="flex items-center gap-3 border-b border-border/60 px-4 py-3 last:border-b-0"
						>
							<div className="text-xs font-mono text-muted-foreground/60">
								{index + 1}
							</div>
							<GithubAvatar
								src={item.avatarUrl}
								alt={item.login}
								size={28}
								className="h-7 w-7 rounded-full"
							/>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">
									{item.login}
								</p>
								<div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground/60">
									<span>
										{item.commits}{" "}
										commits
									</span>
									<span>
										{item.reviews}{" "}
										reviews
									</span>
									<span>
										{item.comments}{" "}
										comments
									</span>
								</div>
							</div>
							<Badge variant="outline">
								Score {item.score}
							</Badge>
						</div>
					))
				) : (
					<div className="px-4 py-10 text-center text-sm text-muted-foreground">
						No contributor activity in the current period.
					</div>
				)}
			</div>
		</section>
	);
}
