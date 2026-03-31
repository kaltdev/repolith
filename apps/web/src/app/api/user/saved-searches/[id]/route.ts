// Handles authenticated saved-search updates and deletion for a single saved-search record.

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";
import type { SavedSearchApiRecord, SavedSearchScope } from "@/types/dashboard";

const updateSavedSearchSchema = z
	.object({
		label: z.string().trim().min(1).max(120).optional(),
		lastUsedAt: z.string().datetime().optional(),
	})
	.strict();

type SavedSearchRow = {
	id: string;
	label: string;
	query: string;
	scope: string;
	lastUsedAt: Date;
};

function toSavedSearchResponse(row: {
	id: string;
	label: string;
	query: string;
	scope: string;
	lastUsedAt: Date;
}): SavedSearchApiRecord {
	return {
		id: row.id,
		label: row.label,
		query: row.query,
		scope: row.scope as SavedSearchScope,
		lastUsedAt: row.lastUsedAt.toISOString(),
	};
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.id) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json().catch(() => null);
	const parsed = updateSavedSearchSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: "Invalid input", details: parsed.error.flatten().fieldErrors },
			{ status: 400 },
		);
	}

	const { label, lastUsedAt } = parsed.data;
	if (label === undefined && lastUsedAt === undefined) {
		return Response.json({ error: "No valid fields to update" }, { status: 400 });
	}

	let rows: SavedSearchRow[] = [];
	if (label !== undefined && lastUsedAt !== undefined) {
		rows = await prisma.$queryRaw<SavedSearchRow[]>`UPDATE saved_searches
			SET label = ${label},
				last_used_at = ${new Date(lastUsedAt)},
				updated_at = NOW()
			WHERE id = ${id} AND user_id = ${session.user.id}
			RETURNING id, label, query, scope, last_used_at AS "lastUsedAt"`;
	} else if (label !== undefined) {
		rows = await prisma.$queryRaw<SavedSearchRow[]>`UPDATE saved_searches
			SET label = ${label},
				updated_at = NOW()
			WHERE id = ${id} AND user_id = ${session.user.id}
			RETURNING id, label, query, scope, last_used_at AS "lastUsedAt"`;
	} else {
		rows = await prisma.$queryRaw<SavedSearchRow[]>`UPDATE saved_searches
			SET last_used_at = ${new Date(lastUsedAt!)},
				updated_at = NOW()
			WHERE id = ${id} AND user_id = ${session.user.id}
			RETURNING id, label, query, scope, last_used_at AS "lastUsedAt"`;
	}

	if (rows.length === 0) {
		return Response.json({ error: "Saved search not found" }, { status: 404 });
	}

	return Response.json(toSavedSearchResponse(rows[0]));
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
	const { id } = await params;
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.id) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const rows = await prisma.$queryRaw<Array<{ id: string }>>`
		DELETE FROM saved_searches
		WHERE id = ${id} AND user_id = ${session.user.id}
		RETURNING id
	`;

	if (rows.length === 0) {
		return Response.json({ error: "Saved search not found" }, { status: 404 });
	}

	return Response.json({ ok: true });
}
