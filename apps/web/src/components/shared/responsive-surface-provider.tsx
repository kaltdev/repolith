"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getResponsiveViewport, type ResponsiveViewport } from "@/lib/responsive-surface-policy";

interface ResponsiveSurfaceContextValue {
	isReady: boolean;
	viewport: ResponsiveViewport;
	width: number;
}

const ResponsiveSurfaceContext = createContext<ResponsiveSurfaceContextValue | null>(null);

export function ResponsiveSurfaceProvider({ children }: { children: ReactNode }) {
	const [width, setWidth] = useState(0);

	useEffect(() => {
		function handleResize() {
			setWidth(window.innerWidth);
		}

		handleResize();
		window.addEventListener("resize", handleResize, { passive: true });

		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const value = useMemo(
		() => ({
			isReady: width > 0,
			viewport: getResponsiveViewport(width || 0),
			width,
		}),
		[width],
	);

	return (
		<ResponsiveSurfaceContext.Provider value={value}>
			{children}
		</ResponsiveSurfaceContext.Provider>
	);
}

export function useResponsiveSurfaceContext() {
	const context = useContext(ResponsiveSurfaceContext);

	if (!context) {
		throw new Error(
			"useResponsiveSurfaceContext must be used within ResponsiveSurfaceProvider",
		);
	}

	return context;
}
