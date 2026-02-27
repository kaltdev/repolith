export type { CodeThemeOption, CustomCodeTheme, CodeThemePreferences } from "./types";
export {
	DEFAULT_CODE_THEME_LIGHT,
	DEFAULT_CODE_THEME_DARK,
	DEFAULT_CODE_FONT,
	DEFAULT_CODE_FONT_SIZE,
	DEFAULT_CODE_THEME_PREFS,
} from "./types";

export { BUILT_IN_THEMES, getBuiltInTheme, getBuiltInThemesByMode } from "./built-in";
export { CODE_FONTS, getCodeFont } from "./fonts";
export type { CodeFontOption } from "./fonts";

export {
	getCustomThemes,
	getCustomTheme,
	saveCustomTheme,
	deleteCustomTheme,
	extractColorsFromVSCodeTheme,
} from "./store";

export { CODE_THEME_COOKIE, getCodeThemePrefs, setCodeThemeCookie } from "./cookie";

import { BUILT_IN_THEMES } from "./built-in";
import { getCustomThemes } from "./store";
import type { CodeThemeOption } from "./types";

/**
 * Get all available themes (built-in + user's custom), optionally filtered by mode.
 */
export async function getAvailableThemes(
	userId: string,
	mode?: "dark" | "light",
): Promise<CodeThemeOption[]> {
	const custom = (await getCustomThemes(userId)).map(
		(ct): CodeThemeOption => ({
			id: ct.id,
			name: ct.name,
			type: "custom",
			mode: ct.mode,
			bgColor: ct.bgColor,
			fgColor: ct.fgColor,
			accentColor: ct.accentColor,
		}),
	);

	const all = [...BUILT_IN_THEMES, ...custom];
	return mode ? all.filter((t) => t.mode === mode) : all;
}
