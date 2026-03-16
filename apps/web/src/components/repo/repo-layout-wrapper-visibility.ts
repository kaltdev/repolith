interface CompactRepoHeaderVisibilityOptions {
	hasSummary: boolean;
	hasSummaryActions: boolean;
	isPersistentSidebar: boolean;
	isReady: boolean;
}

export function shouldRenderCompactRepoHeader({
	hasSummary,
	hasSummaryActions,
	isPersistentSidebar,
	isReady,
}: CompactRepoHeaderVisibilityOptions) {
	if (!isReady || isPersistentSidebar) return false;

	return hasSummary || hasSummaryActions;
}
