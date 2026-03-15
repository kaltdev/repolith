"use client";

import { useState, useEffect } from "react";
import { Pin } from "lucide-react";
import { cn } from "@/lib/utils";
import { isPinnedRepo, pinRepo, unpinRepo } from "@/lib/pinned-repos";

interface PinButtonProps {
	owner: string;
	repo: string;
	language: string | null;
	stargazers_count: number;
	isPrivate: boolean;
	avatarUrl: string;
	size?: "default" | "compact";
}

export function PinButton({
	owner,
	repo,
	language,
	stargazers_count,
	isPrivate,
	avatarUrl,
	size = "default",
}: PinButtonProps) {
	const [isPinned, setIsPinned] = useState(false);
	const isCompact = size === "compact";

	const fullName = `${owner}/${repo}`;

	useEffect(() => {
		setIsPinned(isPinnedRepo(fullName));
	}, [fullName]);

	const toggle = () => {
		if (isPinned) {
			unpinRepo(fullName);
			setIsPinned(false);
		} else {
			pinRepo({
				id: Date.now(),
				full_name: fullName,
				name: repo,
				owner: { login: owner, avatar_url: avatarUrl },
				language,
				stargazers_count,
				private: isPrivate,
			});
			setIsPinned(true);
		}
	};

	return (
		<button
			type="button"
			onClick={toggle}
			className={cn(
				"inline-flex items-center justify-center gap-1.5 font-mono transition-colors cursor-pointer",
				isCompact
					? "h-8 rounded-full bg-muted/55 px-3 text-[11px]"
					: "rounded-md py-1.5 text-[11px]",
				isPinned
					? isCompact
						? "bg-foreground/8 text-foreground hover:bg-foreground/12"
						: "border border-foreground/30 text-foreground hover:bg-foreground/10"
					: cn(
							isCompact
								? "text-muted-foreground hover:bg-muted"
								: "text-muted-foreground",
							"hover:text-foreground hover:border-border",
						),
			)}
		>
			<Pin
				className={cn(
					isCompact ? "w-3.5 h-3.5" : "w-3 h-3",
					isPinned && "fill-current",
				)}
			/>
			{isPinned ? "Pinned" : "Pin"}
		</button>
	);
}
