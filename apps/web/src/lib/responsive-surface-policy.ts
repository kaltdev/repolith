export type ResponsiveViewport = "phone" | "tablet" | "wideTablet" | "desktop";

export type RouteKind =
	| "dashboard"
	| "repoOverview"
	| "repoCode"
	| "repoDocument"
	| "issueDetail"
	| "prDetail"
	| "listWithPeek"
	| "modalOnly";

export type SurfaceId =
	| "repoSidebar"
	| "fileExplorer"
	| "documentOutline"
	| "ghostChat"
	| "detailPeek"
	| "metadataSidebar"
	| "notificationsPanel"
	| "settingsDialog";

export type SurfaceMode = "persistent" | "leftSheet" | "rightSheet" | "bottomSheet" | "modalDialog";

export interface ResponsiveSurfaceContext {
	viewportWidth: number;
	routeKind: RouteKind;
	surfaceId: SurfaceId;
	requestedSurfaceWidth?: number;
	shellGutters?: number;
	anotherMajorSurfaceIsPersistent?: boolean;
}

export interface ResponsiveSurfaceDecision {
	viewport: ResponsiveViewport;
	mainContentMinWidth: number;
	canPersistPrimarySecondary: boolean;
	mode: SurfaceMode;
	shouldPromoteIfOpen: boolean;
	shouldRemainOpenAcrossModeChange: boolean;
}

export const PHONE_MAX_WIDTH = 639;
export const TABLET_MAX_WIDTH = 895;
export const WIDE_TABLET_MAX_WIDTH = 1023;
export const DEFAULT_SHELL_GUTTERS = 32;

const DEFAULT_SURFACE_WIDTHS: Record<SurfaceId, number> = {
	detailPeek: 700,
	documentOutline: 280,
	fileExplorer: 240,
	ghostChat: 380,
	metadataSidebar: 280,
	notificationsPanel: 400,
	repoSidebar: 280,
	settingsDialog: 720,
};

const ROUTE_MIN_WIDTHS: Record<RouteKind, number> = {
	dashboard: 560,
	issueDetail: 560,
	listWithPeek: 560,
	modalOnly: 560,
	prDetail: 640,
	repoCode: 640,
	repoDocument: 640,
	repoOverview: 560,
};

export function getResponsiveViewport(width: number): ResponsiveViewport {
	if (width <= PHONE_MAX_WIDTH) return "phone";
	if (width <= TABLET_MAX_WIDTH) return "tablet";
	if (width <= WIDE_TABLET_MAX_WIDTH) return "wideTablet";
	return "desktop";
}

export function getSurfaceWidth(surfaceId: SurfaceId): number {
	return DEFAULT_SURFACE_WIDTHS[surfaceId];
}

export function getRouteMinWidth(routeKind: RouteKind): number {
	return ROUTE_MIN_WIDTHS[routeKind];
}

export function isMajorSurface(surfaceId: SurfaceId): boolean {
	return surfaceId === "fileExplorer" || surfaceId === "repoSidebar";
}

export function getResponsiveSurfaceDecision({
	viewportWidth,
	routeKind,
	surfaceId,
	requestedSurfaceWidth = getSurfaceWidth(surfaceId),
	shellGutters = DEFAULT_SHELL_GUTTERS,
	anotherMajorSurfaceIsPersistent = false,
}: ResponsiveSurfaceContext): ResponsiveSurfaceDecision {
	const viewport = getResponsiveViewport(viewportWidth);
	const mainContentMinWidth = getRouteMinWidth(routeKind);
	const remainingWidth = viewportWidth - requestedSurfaceWidth - shellGutters;
	const canPersistPrimarySecondary =
		(viewport === "desktop" || viewport === "wideTablet") &&
		remainingWidth >= mainContentMinWidth;

	let mode: SurfaceMode;
	let shouldPromoteIfOpen = false;
	const shouldRemainOpenAcrossModeChange = true;

	switch (surfaceId) {
		case "settingsDialog":
			mode = "modalDialog";
			break;
		case "ghostChat":
		case "notificationsPanel":
			mode = viewport === "phone" ? "bottomSheet" : "rightSheet";
			break;
		case "detailPeek":
			mode = viewport === "phone" ? "bottomSheet" : "rightSheet";
			break;
		case "documentOutline":
			if (viewport === "desktop" && routeKind === "repoDocument") {
				mode = "persistent";
			} else {
				mode = viewport === "phone" ? "bottomSheet" : "rightSheet";
			}
			break;
		case "metadataSidebar":
			if (viewport === "desktop") {
				mode = "persistent";
			} else {
				mode = viewport === "phone" ? "bottomSheet" : "rightSheet";
			}
			break;
		case "repoSidebar":
			if (
				viewport === "desktop" ||
				(viewport === "wideTablet" &&
					routeKind === "repoOverview" &&
					!anotherMajorSurfaceIsPersistent &&
					canPersistPrimarySecondary)
			) {
				mode = "persistent";
				shouldPromoteIfOpen = viewport === "wideTablet";
			} else {
				mode = viewport === "phone" ? "bottomSheet" : "rightSheet";
			}
			break;
		case "fileExplorer":
			if (
				viewport === "desktop" ||
				(viewport === "wideTablet" &&
					(routeKind === "repoCode" ||
						routeKind === "repoDocument") &&
					!anotherMajorSurfaceIsPersistent &&
					canPersistPrimarySecondary)
			) {
				mode = "persistent";
				shouldPromoteIfOpen = viewport === "wideTablet";
			} else {
				mode = "leftSheet";
			}
			break;
	}

	return {
		canPersistPrimarySecondary,
		mainContentMinWidth,
		mode,
		shouldPromoteIfOpen,
		shouldRemainOpenAcrossModeChange,
		viewport,
	};
}
