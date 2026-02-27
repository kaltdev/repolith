"use client";

import { useEffect, useRef } from "react";
import { useColorTheme } from "./theme-provider";

/**
 * Syncs the selected color theme to the server (fire-and-forget).
 * Renders nothing — just a side-effect component.
 */
export function ThemeSync() {
	const { colorTheme } = useColorTheme();
	const prevRef = useRef(colorTheme);

	useEffect(() => {
		if (colorTheme === prevRef.current) return;
		prevRef.current = colorTheme;

		fetch("/api/user-settings", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ colorTheme }),
		}).catch(() => {});
	}, [colorTheme]);

	return null;
}
