"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import {
	DEFAULT_CODE_THEME_LIGHT,
	DEFAULT_CODE_THEME_DARK,
	DEFAULT_CODE_FONT,
	DEFAULT_CODE_FONT_SIZE,
} from "@/lib/code-themes/types";
import type { CodeThemePreferences } from "@/lib/code-themes/types";
import { BUILT_IN_THEMES } from "@/lib/code-themes/built-in";
import { CODE_FONTS } from "@/lib/code-themes/fonts";
import type { CodeFontOption } from "@/lib/code-themes/fonts";

const LS_KEY = "code-theme-prefs";
const COOKIE_KEY = "code-theme-prefs";

interface CodeThemeContextValue {
	codeThemeDark: string;
	codeThemeLight: string;
	codeFont: string;
	codeFontSize: number;
	setCodeThemeDark: (id: string) => void;
	setCodeThemeLight: (id: string) => void;
	setCodeFont: (id: string) => void;
	setCodeFontSize: (size: number) => void;
}

const Ctx = createContext<CodeThemeContextValue | null>(null);

export function useCodeTheme(): CodeThemeContextValue {
	const ctx = useContext(Ctx);
	if (!ctx) throw new Error("useCodeTheme must be used within CodeThemeProvider");
	return ctx;
}

function readLocalPrefs(): CodeThemePreferences {
	if (typeof window === "undefined") {
		return {
			codeThemeLight: DEFAULT_CODE_THEME_LIGHT,
			codeThemeDark: DEFAULT_CODE_THEME_DARK,
			codeFont: DEFAULT_CODE_FONT,
			codeFontSize: DEFAULT_CODE_FONT_SIZE,
		};
	}
	try {
		const raw = localStorage.getItem(LS_KEY);
		if (!raw)
			return {
				codeThemeLight: DEFAULT_CODE_THEME_LIGHT,
				codeThemeDark: DEFAULT_CODE_THEME_DARK,
				codeFont: DEFAULT_CODE_FONT,
				codeFontSize: DEFAULT_CODE_FONT_SIZE,
			};
		const p = JSON.parse(raw);
		return {
			codeThemeLight: p.light ?? DEFAULT_CODE_THEME_LIGHT,
			codeThemeDark: p.dark ?? DEFAULT_CODE_THEME_DARK,
			codeFont: p.fontId ?? DEFAULT_CODE_FONT,
			codeFontSize: p.fontSize ?? DEFAULT_CODE_FONT_SIZE,
		};
	} catch {
		return {
			codeThemeLight: DEFAULT_CODE_THEME_LIGHT,
			codeThemeDark: DEFAULT_CODE_THEME_DARK,
			codeFont: DEFAULT_CODE_FONT,
			codeFontSize: DEFAULT_CODE_FONT_SIZE,
		};
	}
}

function writeLocalPrefs(prefs: CodeThemePreferences) {
	const bgDark = BUILT_IN_THEMES.find((t) => t.id === prefs.codeThemeDark)?.bgColor;
	const bgLight = BUILT_IN_THEMES.find((t) => t.id === prefs.codeThemeLight)?.bgColor;
	const fontDef = CODE_FONTS.find((f) => f.id === prefs.codeFont);

	// Store extra fields for FOUC script
	const val = JSON.stringify({
		light: prefs.codeThemeLight,
		dark: prefs.codeThemeDark,
		fontId: prefs.codeFont,
		fontSize: prefs.codeFontSize,
		// For the FOUC prevention script — use the dark bg by default
		bg: bgDark ?? bgLight,
		font: fontDef?.family ?? "",
	});
	localStorage.setItem(LS_KEY, val);
}

function setCookie(prefs: CodeThemePreferences) {
	const value = JSON.stringify({
		light: prefs.codeThemeLight,
		dark: prefs.codeThemeDark,
		font: prefs.codeFont,
		fontSize: prefs.codeFontSize,
	});
	document.cookie = `${COOKIE_KEY}=${encodeURIComponent(value)};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;
}

function applyCSS(prefs: CodeThemePreferences) {
	const d = document.documentElement;
	const isDark = d.classList.contains("dark");

	// Set code theme background based on active UI mode
	const activeThemeId = isDark ? prefs.codeThemeDark : prefs.codeThemeLight;
	const themeDef = BUILT_IN_THEMES.find((t) => t.id === activeThemeId);
	if (themeDef) {
		d.style.setProperty("--code-theme-bg", themeDef.bgColor);
	} else {
		d.style.removeProperty("--code-theme-bg");
	}

	// Font override
	const fontDef = CODE_FONTS.find((f) => f.id === prefs.codeFont);
	if (fontDef && prefs.codeFont !== "default") {
		d.style.setProperty("--code-font-override", fontDef.family);
	} else {
		d.style.removeProperty("--code-font-override");
	}

	// Font size
	d.style.setProperty("--code-font-size", `${prefs.codeFontSize}px`);
}

function loadGoogleFont(font: CodeFontOption | undefined) {
	if (!font?.googleFontsUrl) return;
	const id = `code-font-${font.id}`;
	if (document.getElementById(id)) return;
	const link = document.createElement("link");
	link.id = id;
	link.rel = "stylesheet";
	link.href = font.googleFontsUrl;
	document.head.appendChild(link);
}

export function CodeThemeProvider({ children }: { children: React.ReactNode }) {
	const [prefs, setPrefs] = useState<CodeThemePreferences>(readLocalPrefs);
	const syncedFromDb = useRef(false);

	// Apply CSS vars whenever prefs change
	useEffect(() => {
		applyCSS(prefs);
		const fontDef = CODE_FONTS.find((f) => f.id === prefs.codeFont);
		loadGoogleFont(fontDef);
	}, [prefs]);

	// Re-apply when UI theme changes (dark/light toggle)
	useEffect(() => {
		let raf: number;
		const observer = new MutationObserver(() => {
			// Debounce with rAF to batch rapid class changes
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(() => applyCSS(prefs));
		});
		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["class"],
		});
		return () => {
			observer.disconnect();
			cancelAnimationFrame(raf);
		};
	}, [prefs]);

	// Sync from DB on mount
	useEffect(() => {
		if (syncedFromDb.current) return;
		syncedFromDb.current = true;

		fetch("/api/user-settings")
			.then((r) => (r.ok ? r.json() : null))
			.then((settings) => {
				if (!settings) return;
				const dbPrefs: CodeThemePreferences = {
					codeThemeLight:
						settings.codeThemeLight ?? DEFAULT_CODE_THEME_LIGHT,
					codeThemeDark:
						settings.codeThemeDark ?? DEFAULT_CODE_THEME_DARK,
					codeFont: settings.codeFont ?? DEFAULT_CODE_FONT,
					codeFontSize:
						settings.codeFontSize ?? DEFAULT_CODE_FONT_SIZE,
				};
				const local = readLocalPrefs();
				const changed =
					dbPrefs.codeThemeLight !== local.codeThemeLight ||
					dbPrefs.codeThemeDark !== local.codeThemeDark ||
					dbPrefs.codeFont !== local.codeFont ||
					dbPrefs.codeFontSize !== local.codeFontSize;
				if (changed) {
					writeLocalPrefs(dbPrefs);
					setCookie(dbPrefs);
					setPrefs(dbPrefs);
				}
			})
			.catch(() => {});
	}, []);

	const persistUpdate = useCallback((newPrefs: CodeThemePreferences) => {
		writeLocalPrefs(newPrefs);
		setCookie(newPrefs);
		setPrefs(newPrefs);

		// Persist to DB in background
		fetch("/api/user-settings", {
			method: "PATCH",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				codeThemeLight: newPrefs.codeThemeLight,
				codeThemeDark: newPrefs.codeThemeDark,
				codeFont: newPrefs.codeFont,
				codeFontSize: newPrefs.codeFontSize,
			}),
		}).catch(() => {});
	}, []);

	const setCodeThemeDark = useCallback(
		(id: string) => persistUpdate({ ...prefs, codeThemeDark: id }),
		[prefs, persistUpdate],
	);
	const setCodeThemeLight = useCallback(
		(id: string) => persistUpdate({ ...prefs, codeThemeLight: id }),
		[prefs, persistUpdate],
	);
	const setCodeFont = useCallback(
		(id: string) => persistUpdate({ ...prefs, codeFont: id }),
		[prefs, persistUpdate],
	);
	const setCodeFontSize = useCallback(
		(size: number) => persistUpdate({ ...prefs, codeFontSize: size }),
		[prefs, persistUpdate],
	);

	return (
		<Ctx.Provider
			value={{
				codeThemeDark: prefs.codeThemeDark,
				codeThemeLight: prefs.codeThemeLight,
				codeFont: prefs.codeFont,
				codeFontSize: prefs.codeFontSize,
				setCodeThemeDark,
				setCodeThemeLight,
				setCodeFont,
				setCodeFontSize,
			}}
		>
			{children}
		</Ctx.Provider>
	);
}
