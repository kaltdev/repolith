import { useResponsiveSurfaceContext } from "@/components/shared/responsive-surface-provider";

export function useIsMobile() {
	const { isReady, viewport } = useResponsiveSurfaceContext();

	if (!isReady) return undefined;

	return viewport === "phone";
}
