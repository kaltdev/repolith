"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";
import { cn } from "@/lib/utils";

export function RefreshButton() {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();
	const [spinning, setSpinning] = useState(false);

	function handleRefresh() {
		setSpinning(true);
		startTransition(() => {
			router.refresh();
		});
		setTimeout(() => setSpinning(false), 1000);
	}

	return (
		<button
			onClick={handleRefresh}
			disabled={isPending}
			className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/50 hover:text-foreground transition-colors cursor-pointer shrink-0 disabled:opacity-40"
			title="Refresh"
		>
			<RotateCw
				className={cn(
					"w-3 h-3 transition-transform",
					(isPending || spinning) && "animate-spin",
				)}
			/>
		</button>
	);
}
