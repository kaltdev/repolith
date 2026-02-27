"use client";

import { useColorTheme } from "@/components/theme/theme-provider";

function StarIcon({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 16 16" fill="currentColor" className={className}>
			<path d="M8 0a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0V1a1 1 0 0 1 1-1Zm0 12a1 1 0 0 1 1 1v1a1 1 0 1 1-2 0v-1a1 1 0 0 1 1-1Zm8-4a1 1 0 0 1-1 1h-1a1 1 0 1 1 0-2h1a1 1 0 0 1 1 1ZM4 8a1 1 0 0 1-1 1H2a1 1 0 0 1 0-2h1a1 1 0 0 1 1 1Zm9.657-5.657a1 1 0 0 1 0 1.414l-.707.707a1 1 0 1 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0Zm-9.9 9.9a1 1 0 0 1 0 1.414l-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0Zm9.9 0a1 1 0 0 1 0 1.414l-.707.707a1 1 0 0 1-1.414-1.414l.707-.707a1 1 0 0 1 1.414 0ZM3.757 2.343a1 1 0 0 1 0 1.414l-.707.707A1 1 0 0 1 1.636 3.05l.707-.707a1 1 0 0 1 1.414 0ZM8 5a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z" />
		</svg>
	);
}

function CrescentIcon({ className }: { className?: string }) {
	return (
		<svg viewBox="0 0 16 16" fill="currentColor" className={className}>
			<path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277q.792-.001 1.533-.16a.79.79 0 0 1 .81.316.73.73 0 0 1-.031.893A8.35 8.35 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.75.75 0 0 1 6 .278" />
		</svg>
	);
}

export function ThemeToggle() {
	const { mode, toggleMode } = useColorTheme();
	const isDark = mode === "dark";

	return (
		<button
			onClick={(e) => toggleMode(e)}
			className="relative flex items-center w-[34px] h-[18px] rounded-full border border-border bg-muted/60 transition-colors cursor-pointer hover:border-foreground/20"
			title={isDark ? "Switch to light mode" : "Switch to dark mode"}
		>
			<span
				className="absolute top-[2px] flex items-center justify-center w-3 h-3 rounded-full bg-foreground transition-all duration-200"
				style={{ left: isDark ? "2px" : "16px" }}
			>
				{isDark ? (
					<CrescentIcon className="size-[7px] text-background" />
				) : (
					<StarIcon className="size-2 text-background" />
				)}
			</span>
			<span className="sr-only">Toggle theme</span>
		</button>
	);
}
