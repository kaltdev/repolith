import {
	CheckCircle2,
	XCircle,
	Loader2,
	StopCircle,
	SkipForward,
	Clock,
	Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function StatusIcon({
	status,
	conclusion,
	className,
}: {
	status: string;
	conclusion: string | null;
	className?: string;
}) {
	const size = cn("w-3.5 h-3.5 shrink-0", className);

	if (status === "in_progress") {
		return <Loader2 className={cn(size, "text-warning animate-spin")} />;
	}

	if (status === "queued" || status === "waiting" || status === "pending") {
		return <Circle className={cn(size, "text-warning/60")} />;
	}

	if (status === "completed" || status === "action_required") {
		switch (conclusion) {
			case "success":
				return <CheckCircle2 className={cn(size, "text-success")} />;
			case "failure":
				return <XCircle className={cn(size, "text-destructive")} />;
			case "cancelled":
				return <StopCircle className={cn(size, "text-muted-foreground")} />;
			case "skipped":
				return (
					<SkipForward
						className={cn(size, "text-muted-foreground")}
					/>
				);
			case "action_required":
				return <Clock className={cn(size, "text-warning")} />;
			default:
				return (
					<CheckCircle2
						className={cn(size, "text-muted-foreground")}
					/>
				);
		}
	}

	return <Clock className={cn(size, "text-muted-foreground")} />;
}
