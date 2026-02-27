"use client";

import { useEffect } from "react";
import { addRecentView, type RecentViewItem } from "@/lib/recent-views";

export function TrackView(props: Omit<RecentViewItem, "viewedAt">) {
	useEffect(() => {
		addRecentView(props);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [props.url]);

	return null;
}
