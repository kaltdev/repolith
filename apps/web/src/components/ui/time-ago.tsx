"use client";

import { useState, useEffect } from "react";
import { timeAgo } from "@/lib/utils";

interface TimeAgoProps {
	date: string | Date;
	className?: string;
}

export function TimeAgo({ date, className }: TimeAgoProps) {
	const [text, setText] = useState(() => timeAgo(date));

	useEffect(() => {
		setText(timeAgo(date));
		const interval = setInterval(() => setText(timeAgo(date)), 60_000);
		return () => clearInterval(interval);
	}, [date]);

	return (
		<time
			dateTime={typeof date === "string" ? date : date.toISOString()}
			title={new Date(date).toLocaleString()}
			className={className}
			suppressHydrationWarning
		>
			{text}
		</time>
	);
}
