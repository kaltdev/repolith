"use client";

import { useState, useTransition } from "react";
import { Star } from "lucide-react";
import { starRepo, unstarRepo } from "@/app/(app)/repos/actions";
import { cn, formatNumber } from "@/lib/utils";
import { useMutationEvents } from "@/components/shared/mutation-event-provider";

interface StarButtonProps {
	owner: string;
	repo: string;
	starred: boolean;
	starCount: number;
	size?: "default" | "compact";
}

export function StarButton({ owner, repo, starred, starCount, size = "default" }: StarButtonProps) {
	const [isStarred, setIsStarred] = useState(starred);
	const [count, setCount] = useState(starCount);
	const [isPending, startTransition] = useTransition();
	const { emit } = useMutationEvents();
	const isCompact = size === "compact";

	const toggle = () => {
		const next = !isStarred;
		setIsStarred(next);
		setCount((c) => c + (next ? 1 : -1));
		emit({ type: next ? "repo:starred" : "repo:unstarred", owner, repo });
		startTransition(async () => {
			const res = next
				? await starRepo(owner, repo)
				: await unstarRepo(owner, repo);
			if (res.error) {
				setIsStarred(!next);
				setCount((c) => c + (next ? -1 : 1));
			}
		});
	};

	return (
		<button
			type="button"
			onClick={toggle}
			disabled={isPending}
			className={cn(
				"inline-flex items-center justify-center gap-1.5 font-mono transition-colors cursor-pointer",
				isCompact
					? "h-8 rounded-full bg-muted/55 px-3 text-[11px]"
					: "rounded-md border py-1.5 text-[11px]",
				isStarred
					? isCompact
						? "text-warning hover:bg-warning/12"
						: "border-warning/30 text-warning hover:bg-warning/10"
					: isCompact
						? "text-muted-foreground hover:bg-muted hover:text-foreground"
						: "border-border text-muted-foreground hover:text-foreground hover:border-border",
				isPending && "opacity-60 pointer-events-none",
			)}
		>
			<Star
				className={cn(
					isCompact ? "w-3.5 h-3.5" : "w-3 h-3",
					isStarred && "fill-current",
				)}
			/>
			{isStarred ? "Starred" : "Star"}
			<span
				className={cn(
					isCompact
						? "text-[10px] tabular-nums"
						: "text-[10px] ml-0.5",
					isStarred
						? isCompact
							? "text-warning/70"
							: "text-warning/70"
						: isCompact
							? "text-muted-foreground/55"
							: "text-muted-foreground/60",
				)}
			>
				{formatNumber(count)}
			</span>
		</button>
	);
}
