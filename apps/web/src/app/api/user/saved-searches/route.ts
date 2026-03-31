// Handles authenticated saved-search listing and creation for the dashboard/search surfaces.

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { z } from "zod";
import {
	SAVED_SEARCH_SCOPES,
	type SavedSearchApiRecord,
	type SavedSearchScope,
} from "@/types/dashboard";

const createSavedSearchSchema = z
	.object({
		label: z.string().trim().min(1).max(120),
		query: z.string().trim().min(1).max(5000),
		scope: z.enum(SAVED_SEARCH_SCOPES),
	})
	.strict();

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

export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.id) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const savedSearches = await prisma.$queryRaw<
		Array<{
			id: string;
			label: string;
			query: string;
			scope: string;
			lastUsedAt: Date;
		}>
	>`SELECT id, label, query, scope, last_used_at AS "lastUsedAt"
		FROM saved_searches
		WHERE user_id = ${session.user.id}
		ORDER BY last_used_at DESC, updated_at DESC`;

	return Response.json(savedSearches.map(toSavedSearchResponse));
}

export async function POST(request: Request) {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.id) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	const body = await request.json().catch(() => null);
	const parsed = createSavedSearchSchema.safeParse(body);
	if (!parsed.success) {
		return Response.json(
			{ error: "Invalid input", details: parsed.error.flatten().fieldErrors },
			{ status: 400 },
		);
	}

	const countRows = await prisma.$queryRaw<Array<{ count: number }>>`
		SELECT COUNT(*)::int AS count
		FROM saved_searches
		WHERE user_id = ${session.user.id}
	`;
	const existingCount = countRows[0]?.count ?? 0;
	if (existingCount >= 20) {
		return Response.json({ error: "Saved search limit reached" }, { status: 409 });
	}

	const savedSearch = await prisma.$queryRaw<
		Array<{
			id: string;
			label: string;
			query: string;
			scope: string;
			lastUsedAt: Date;
		}>
	>`INSERT INTO saved_searches (id, user_id, label, query, scope, last_used_at, created_at, updated_at)
		VALUES (
			${crypto.randomUUID()},
			${session.user.id},
			${parsed.data.label},
			${parsed.data.query},
			${parsed.data.scope},
			NOW(),
			NOW(),
			NOW()
		)
		RETURNING id, label, query, scope, last_used_at AS "lastUsedAt"`;

	const record = savedSearch[0];
	if (!record) {
		return Response.json({ error: "Failed to create saved search" }, { status: 500 });
	}

	return Response.json(toSavedSearchResponse(record), { status: 201 });
}
