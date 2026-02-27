import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import {
	getGhostTabState,
	addGhostTab,
	closeGhostTab,
	setActiveGhostTab,
	renameGhostTab,
} from "@/lib/chat-store";

async function getSessionUserId(): Promise<string | null> {
	const session = await auth.api.getSession({
		headers: await headers(),
	});
	return session?.user?.id ?? null;
}

export async function GET() {
	const userId = await getSessionUserId();
	if (!userId) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const state = await getGhostTabState(userId);
	return Response.json(state);
}

export async function POST(req: Request) {
	const userId = await getSessionUserId();
	if (!userId) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const { action, tabId, label, counter, newDefault } = await req.json();

	switch (action) {
		case "add": {
			if (!tabId || !label || counter == null) {
				return Response.json(
					{ error: "tabId, label, counter required" },
					{ status: 400 },
				);
			}
			await addGhostTab(userId, tabId, label, counter);
			return Response.json({ ok: true });
		}
		case "close": {
			if (!tabId) {
				return Response.json({ error: "tabId required" }, { status: 400 });
			}
			await closeGhostTab(userId, tabId, newDefault);
			return Response.json({ ok: true });
		}
		case "rename": {
			if (!tabId || !label) {
				return Response.json(
					{ error: "tabId, label required" },
					{ status: 400 },
				);
			}
			await renameGhostTab(userId, tabId, label);
			return Response.json({ ok: true });
		}
		case "switch": {
			if (!tabId) {
				return Response.json({ error: "tabId required" }, { status: 400 });
			}
			await setActiveGhostTab(userId, tabId);
			return Response.json({ ok: true });
		}
		default:
			return Response.json({ error: "Invalid action" }, { status: 400 });
	}
}
