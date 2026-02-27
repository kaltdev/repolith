import { useState, useEffect, useRef, useCallback } from "react";

export function useInfiniteScroll<T>(
	filtered: T[],
	resetDeps: unknown[],
	pageSize: number = 15,
): {
	visible: T[];
	hasMore: boolean;
	loadMore: () => void;
	sentinelRef: React.RefObject<HTMLDivElement | null>;
} {
	const [visibleCount, setVisibleCount] = useState(pageSize);
	const sentinelRef = useRef<HTMLDivElement>(null);

	// Reset visible count when deps change
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(() => {
		setVisibleCount(pageSize);
	}, resetDeps);

	const hasMore = visibleCount < filtered.length;
	const visible = filtered.slice(0, visibleCount);

	const loadMore = useCallback(() => {
		setVisibleCount((v) => Math.min(v + pageSize, filtered.length));
	}, [filtered.length, pageSize]);

	useEffect(() => {
		const sentinel = sentinelRef.current;
		if (!sentinel) return;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries[0].isIntersecting) loadMore();
			},
			{ rootMargin: "200px" },
		);
		observer.observe(sentinel);
		return () => observer.disconnect();
	}, [loadMore]);

	return { visible, hasMore, loadMore, sentinelRef };
}
