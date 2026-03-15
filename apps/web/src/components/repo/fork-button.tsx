"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { GitFork, Loader2 } from "lucide-react";
import { forkRepo } from "@/app/(app)/repos/actions";
import { cn, formatNumber } from "@/lib/utils";

interface ForkButtonProps {
	owner: string;
	repo: string;
	forkCount: number;
	disabled?: boolean;
	size?: "default" | "compact";
}

export function ForkButton({
	owner,
	repo,
	forkCount,
	disabled = false,
	size = "default",
}: ForkButtonProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [error, setError] = useState<string | null>(null);
	const isCompact = size === "compact";

	const handleFork = () => {
		if (disabled || isPending) return;
		setError(null);
		startTransition(async () => {
			const res = await forkRepo(owner, repo);
			if (res.error) {
				setError(res.error);
				return;
			}
			if (res.full_name) {
				router.push(`/${res.full_name}`);
			}
		});
	};

	return (
		<div className={cn("flex flex-col", isCompact ? "items-start" : "items-center")}>
			<button
				type="button"
				onClick={handleFork}
				disabled={isPending || disabled}
				className={cn(
					"inline-flex items-center justify-center gap-1.5 font-mono transition-colors",
					isCompact
						? "h-8 rounded-full bg-muted/55 px-3 text-[11px] text-muted-foreground"
						: "w-full rounded-md py-1.5 text-[11px] text-muted-foreground",
					!(isPending || disabled) &&
						"cursor-pointer hover:text-foreground hover:bg-muted",
					(isPending || disabled) &&
						"text-muted-foreground/60 pointer-events-none cursor-not-allowed",
				)}
			>
				{isPending ? (
					<Loader2
						className={cn(
							isCompact ? "w-3.5 h-3.5" : "w-3 h-3",
							"animate-spin",
						)}
					/>
				) : (
					<GitFork
						className={cn(
							isCompact ? "w-3.5 h-3.5" : "w-3 h-3",
						)}
					/>
				)}
				{isPending ? "Forking..." : "Fork"}
				<span
					className={cn(
						isCompact
							? "text-[10px] text-muted-foreground/55 tabular-nums"
							: "text-muted-foreground/50 tabular-nums",
					)}
				>
					{formatNumber(forkCount)}
				</span>
			</button>
			{error && (
				<p className="text-[10px] text-destructive font-mono mt-0.5">
					{error}
				</p>
			)}
		</div>
	);
}
