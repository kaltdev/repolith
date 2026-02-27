import { cookies } from "next/headers";
import { type CodeThemePreferences, DEFAULT_CODE_THEME_PREFS } from "./types";

export const CODE_THEME_COOKIE = "code-theme-prefs";

/**
 * Server-side: read code theme preferences from cookie.
 * Returns defaults if cookie is missing or malformed.
 */
export async function getCodeThemePrefs(): Promise<CodeThemePreferences> {
	try {
		const cookieStore = await cookies();
		const raw = cookieStore.get(CODE_THEME_COOKIE)?.value;
		if (!raw) return DEFAULT_CODE_THEME_PREFS;
		const parsed = JSON.parse(raw);
		return {
			codeThemeLight: parsed.light ?? DEFAULT_CODE_THEME_PREFS.codeThemeLight,
			codeThemeDark: parsed.dark ?? DEFAULT_CODE_THEME_PREFS.codeThemeDark,
			codeFont: parsed.font ?? DEFAULT_CODE_THEME_PREFS.codeFont,
			codeFontSize: parsed.fontSize ?? DEFAULT_CODE_THEME_PREFS.codeFontSize,
		};
	} catch {
		return DEFAULT_CODE_THEME_PREFS;
	}
}

/**
 * Client-side: set the code theme prefs cookie.
 */
export function setCodeThemeCookie(prefs: CodeThemePreferences): void {
	const value = JSON.stringify({
		light: prefs.codeThemeLight,
		dark: prefs.codeThemeDark,
		font: prefs.codeFont,
		fontSize: prefs.codeFontSize,
	});
	document.cookie = `${CODE_THEME_COOKIE}=${encodeURIComponent(value)};path=/;max-age=${365 * 24 * 60 * 60};samesite=lax`;
}
