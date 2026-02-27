export interface CodeThemeOption {
	id: string;
	name: string;
	type: "built-in" | "custom";
	mode: "dark" | "light";
	bgColor: string;
	fgColor: string;
	accentColor: string;
}

export interface CustomCodeTheme {
	id: string;
	userId: string;
	name: string;
	mode: "dark" | "light";
	themeJson: string;
	bgColor: string;
	fgColor: string;
	accentColor: string;
	createdAt: string;
}

export interface CodeThemePreferences {
	codeThemeLight: string;
	codeThemeDark: string;
	codeFont: string;
	codeFontSize: number;
}

export const DEFAULT_CODE_THEME_LIGHT = "vitesse-light";
export const DEFAULT_CODE_THEME_DARK = "vitesse-black";
export const DEFAULT_CODE_FONT = "default";
export const DEFAULT_CODE_FONT_SIZE = 13;

export const DEFAULT_CODE_THEME_PREFS: CodeThemePreferences = {
	codeThemeLight: DEFAULT_CODE_THEME_LIGHT,
	codeThemeDark: DEFAULT_CODE_THEME_DARK,
	codeFont: DEFAULT_CODE_FONT,
	codeFontSize: DEFAULT_CODE_FONT_SIZE,
};
