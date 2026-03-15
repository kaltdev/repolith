import { describe, expect, it } from "vitest";
import { getResponsiveSurfaceDecision, getResponsiveViewport } from "./responsive-surface-policy";

describe("responsive surface policy", () => {
	it("classifies viewport boundaries deterministically", () => {
		expect(getResponsiveViewport(320)).toBe("phone");
		expect(getResponsiveViewport(639)).toBe("phone");
		expect(getResponsiveViewport(640)).toBe("tablet");
		expect(getResponsiveViewport(895)).toBe("tablet");
		expect(getResponsiveViewport(896)).toBe("wideTablet");
		expect(getResponsiveViewport(1023)).toBe("wideTablet");
		expect(getResponsiveViewport(1024)).toBe("desktop");
	});

	it("keeps the repo sidebar toggleable for code routes on wide tablets", () => {
		expect(
			getResponsiveSurfaceDecision({
				routeKind: "repoCode",
				surfaceId: "repoSidebar",
				viewportWidth: 980,
			}).mode,
		).toBe("rightSheet");
	});

	it("promotes the repo sidebar on wide-tablet overview routes when space allows", () => {
		expect(
			getResponsiveSurfaceDecision({
				routeKind: "repoOverview",
				surfaceId: "repoSidebar",
				viewportWidth: 980,
			}),
		).toMatchObject({
			canPersistPrimarySecondary: true,
			mode: "persistent",
			shouldPromoteIfOpen: true,
			viewport: "wideTablet",
		});
	});

	it("allows the file explorer to persist as the single major secondary surface", () => {
		expect(
			getResponsiveSurfaceDecision({
				routeKind: "repoCode",
				surfaceId: "fileExplorer",
				viewportWidth: 980,
			}),
		).toMatchObject({
			canPersistPrimarySecondary: true,
			mode: "persistent",
			shouldPromoteIfOpen: true,
			viewport: "wideTablet",
		});
	});

	it("keeps the file explorer toggleable when another major surface is already persistent", () => {
		expect(
			getResponsiveSurfaceDecision({
				anotherMajorSurfaceIsPersistent: true,
				routeKind: "repoCode",
				surfaceId: "fileExplorer",
				viewportWidth: 980,
			}).mode,
		).toBe("leftSheet");
	});

	it("falls back to sheets when wide-tablet space is too tight for technical content", () => {
		expect(
			getResponsiveSurfaceDecision({
				routeKind: "repoDocument",
				surfaceId: "fileExplorer",
				viewportWidth: 900,
			}),
		).toMatchObject({
			canPersistPrimarySecondary: false,
			mode: "leftSheet",
			viewport: "wideTablet",
		});
	});

	it("uses bottom sheets on phones and side sheets above phone for tertiary surfaces", () => {
		expect(
			getResponsiveSurfaceDecision({
				routeKind: "repoDocument",
				surfaceId: "documentOutline",
				viewportWidth: 375,
			}).mode,
		).toBe("bottomSheet");
		expect(
			getResponsiveSurfaceDecision({
				routeKind: "repoDocument",
				surfaceId: "ghostChat",
				viewportWidth: 768,
			}).mode,
		).toBe("rightSheet");
	});

	it("keeps metadata sidebars persistent only on desktop", () => {
		expect(
			getResponsiveSurfaceDecision({
				routeKind: "issueDetail",
				surfaceId: "metadataSidebar",
				viewportWidth: 768,
			}).mode,
		).toBe("rightSheet");
		expect(
			getResponsiveSurfaceDecision({
				routeKind: "issueDetail",
				surfaceId: "metadataSidebar",
				viewportWidth: 1280,
			}).mode,
		).toBe("persistent");
	});
});
