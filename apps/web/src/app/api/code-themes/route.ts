import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
	getCustomThemes,
	saveCustomTheme,
	deleteCustomTheme,
	extractColorsFromVSCodeTheme,
} from "@/lib/code-themes/store";

export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.id) {
		return new Response("Unauthorized", { status: 401 });
	}

	const themes = await getCustomThemes(session.user.id);
	return Response.json(
		themes.map((t) => ({
			id: t.id,
			name: t.name,
			mode: t.mode,
			bgColor: t.bgColor,
			fgColor: t.fgColor,
			accentColor: t.accentColor,
		})),
	);
}

export async function POST(request: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.id) {
		return new Response("Unauthorized", { status: 401 });
	}

	let body: { name?: string; themeJson?: unknown };
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const { name, themeJson } = body;
	if (!name || typeof name !== "string") {
		return Response.json({ error: "Name is required" }, { status: 400 });
	}
	if (!themeJson || typeof themeJson !== "object") {
		return Response.json({ error: "Theme JSON is required" }, { status: 400 });
	}

	// Validate it looks like a VS Code theme
	const json = themeJson as Record<string, unknown>;
	if (!json.tokenColors && !json.colors) {
		return Response.json(
			{ error: "Invalid VS Code theme: must contain tokenColors or colors" },
			{ status: 400 },
		);
	}

	try {
		const { bg, fg, accent, mode } = extractColorsFromVSCodeTheme(json);
		const theme = await saveCustomTheme(
			session.user.id,
			name,
			mode,
			JSON.stringify(themeJson),
			bg,
			fg,
			accent,
		);

		return Response.json({
			id: theme.id,
			name: theme.name,
			mode: theme.mode,
			bgColor: theme.bgColor,
			fgColor: theme.fgColor,
			accentColor: theme.accentColor,
		});
	} catch {
		return Response.json({ error: "Failed to save theme" }, { status: 500 });
	}
}

export async function DELETE(request: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.id) {
		return new Response("Unauthorized", { status: 401 });
	}

	let body: { id?: string };
	try {
		body = await request.json();
	} catch {
		return Response.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const { id } = body;
	if (!id || typeof id !== "string") {
		return Response.json({ error: "Theme ID is required" }, { status: 400 });
	}

	const deleted = await deleteCustomTheme(id, session.user.id);
	if (!deleted) {
		return Response.json({ error: "Theme not found" }, { status: 404 });
	}

	return Response.json({ ok: true });
}
