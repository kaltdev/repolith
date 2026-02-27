import { prisma } from "../db";
import type { CustomCodeTheme } from "./types";

function toTheme(row: {
	id: string;
	userId: string;
	name: string;
	mode: string;
	themeJson: string;
	bgColor: string;
	fgColor: string;
	accentColor: string;
	createdAt: string;
}): CustomCodeTheme {
	return {
		id: row.id,
		userId: row.userId,
		name: row.name,
		mode: row.mode as "dark" | "light",
		themeJson: row.themeJson,
		bgColor: row.bgColor,
		fgColor: row.fgColor,
		accentColor: row.accentColor,
		createdAt: row.createdAt,
	};
}

export async function getCustomThemes(userId: string): Promise<CustomCodeTheme[]> {
	const rows = await prisma.customCodeTheme.findMany({
		where: { userId },
		orderBy: { createdAt: "desc" },
	});
	return rows.map(toTheme);
}

export async function getCustomTheme(id: string): Promise<CustomCodeTheme | null> {
	const row = await prisma.customCodeTheme.findUnique({ where: { id } });
	return row ? toTheme(row) : null;
}

export async function saveCustomTheme(
	userId: string,
	name: string,
	mode: "dark" | "light",
	themeJson: string,
	bgColor: string,
	fgColor: string,
	accentColor: string,
): Promise<CustomCodeTheme> {
	const id = crypto.randomUUID();
	const now = new Date().toISOString();

	const created = await prisma.customCodeTheme.create({
		data: {
			id,
			userId,
			name,
			mode,
			themeJson,
			bgColor,
			fgColor,
			accentColor,
			createdAt: now,
		},
	});

	return toTheme(created);
}

export async function deleteCustomTheme(id: string, userId: string): Promise<boolean> {
	const result = await prisma.customCodeTheme.deleteMany({
		where: { id, userId },
	});
	return result.count > 0;
}

/**
 * Extract editor colors from a VS Code theme JSON.
 * Returns { bg, fg, accent } from editor colors and tokenColors.
 */
export function extractColorsFromVSCodeTheme(json: Record<string, unknown>): {
	bg: string;
	fg: string;
	accent: string;
	mode: "dark" | "light";
} {
	const colors = (json.colors ?? {}) as Record<string, string>;
	const bg = colors["editor.background"] ?? "#1e1e1e";
	const fg = colors["editor.foreground"] ?? "#d4d4d4";

	let accent = fg;
	const tokenColors = json.tokenColors as
		| Array<{
				scope?: string | string[];
				settings?: { foreground?: string };
		  }>
		| undefined;

	if (Array.isArray(tokenColors)) {
		for (const tc of tokenColors) {
			const scopes = Array.isArray(tc.scope) ? tc.scope : [tc.scope];
			if (scopes.some((s) => s === "keyword" || s === "keyword.control")) {
				accent = tc.settings?.foreground ?? accent;
				break;
			}
		}
	}

	const mode = isColorDark(bg) ? "dark" : "light";

	return { bg, fg, accent, mode };
}

function isColorDark(hex: string): boolean {
	const c = hex.replace("#", "");
	if (c.length < 6) return true;
	const r = parseInt(c.slice(0, 2), 16);
	const g = parseInt(c.slice(2, 4), 16);
	const b = parseInt(c.slice(4, 6), 16);
	const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
	return luminance < 0.5;
}
