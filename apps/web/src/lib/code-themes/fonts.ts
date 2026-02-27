export interface CodeFontOption {
	id: string;
	name: string;
	family: string;
	googleFontsUrl?: string;
}

export const CODE_FONTS: CodeFontOption[] = [
	{
		id: "default",
		name: "JetBrains Mono",
		family: "var(--font-code), ui-monospace, monospace",
	},
	{
		id: "geist-mono",
		name: "Geist Mono",
		family: "var(--font-geist-mono), ui-monospace, monospace",
	},
	{
		id: "fira-code",
		name: "Fira Code",
		family: "'Fira Code', ui-monospace, monospace",
		googleFontsUrl:
			"https://fonts.googleapis.com/css2?family=Fira+Code:wght@400;500;600&display=swap",
	},
	{
		id: "source-code-pro",
		name: "Source Code Pro",
		family: "'Source Code Pro', ui-monospace, monospace",
		googleFontsUrl:
			"https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600&display=swap",
	},
	{
		id: "ibm-plex-mono",
		name: "IBM Plex Mono",
		family: "'IBM Plex Mono', ui-monospace, monospace",
		googleFontsUrl:
			"https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap",
	},
	{
		id: "sf-mono",
		name: "SF Mono (System)",
		family: "'SF Mono', 'Menlo', 'Monaco', 'Consolas', ui-monospace, monospace",
	},
];

export function getCodeFont(id: string): CodeFontOption | undefined {
	return CODE_FONTS.find((f) => f.id === id);
}
