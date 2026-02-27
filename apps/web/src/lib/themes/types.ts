export interface ThemeColors {
	"--background": string;
	"--foreground": string;
	"--card": string;
	"--card-foreground": string;
	"--primary": string;
	"--primary-foreground": string;
	"--secondary": string;
	"--secondary-foreground": string;
	"--muted": string;
	"--muted-foreground": string;
	"--accent": string;
	"--accent-foreground": string;
	"--border": string;
	"--input": string;
	"--ring": string;
	"--destructive": string;
	"--success": string;
	"--warning": string;
	"--scrollbar-thumb": string;
	"--scrollbar-thumb-hover": string;
	"--shader-bg": string;
	"--shader-filter": string;
	"--hero-border": string;
	"--diff-add-bar": string;
	"--diff-del-bar": string;
	"--diff-mod-bar": string;
	// New theme-specific variables
	"--link": string;
	"--info": string;
	"--code-bg": string;
	"--code-block-bg": string;
	"--inline-code-bg": string;
	"--line-gutter": string;
	"--line-highlight": string;
	"--search-highlight": string;
	"--search-highlight-active": string;
	"--selection-bg": string;
	"--table-row-alt": string;
	"--diff-add-bg": string;
	"--diff-del-bg": string;
	"--diff-add-text": string;
	"--diff-del-text": string;
	"--diff-add-gutter": string;
	"--diff-del-gutter": string;
	"--diff-word-add": string;
	"--diff-word-del": string;
	"--alert-note": string;
	"--alert-tip": string;
	"--alert-important": string;
	"--alert-warning": string;
	"--alert-caution": string;
	"--contrib-0": string;
	"--contrib-1": string;
	"--contrib-2": string;
	"--contrib-3": string;
	"--contrib-4": string;
}

export interface ThemeDefinition {
	id: string;
	name: string;
	description: string;
	mode: "dark" | "light";
	/** Accent color for preview dot */
	accentPreview: string;
	/** Background color for preview dot */
	bgPreview: string;
	colors: ThemeColors;
}
