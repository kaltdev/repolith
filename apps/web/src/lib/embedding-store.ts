import crypto from "crypto";
import { prisma } from "./db";
import type { Prisma, SearchEmbedding } from "../generated/prisma/client";

export type ContentType = "pr" | "issue" | "pr_comment" | "issue_comment" | "review";

export interface EmbeddingEntry {
	userId: string;
	contentType: ContentType;
	contentKey: string;
	owner: string;
	repo: string;
	itemNumber: number;
	contentHash: string;
	embedding: number[];
	title: string | null;
	snippet: string;
	metadata?: Record<string, unknown>;
}

export interface SearchResult {
	contentType: ContentType;
	contentKey: string;
	owner: string;
	repo: string;
	itemNumber: number;
	title: string | null;
	snippet: string;
	metadata: Record<string, unknown> | null;
	similarity: number;
}

function makeId(userId: string, contentType: string, contentKey: string): string {
	return crypto
		.createHash("sha256")
		.update(`${userId}:${contentType}:${contentKey}`)
		.digest("hex");
}

export function hashContent(text: string): string {
	return crypto.createHash("sha256").update(text).digest("hex");
}

function cosineSimilarity(a: number[], b: number[]): number {
	let dot = 0;
	let normA = 0;
	let normB = 0;
	for (let i = 0; i < a.length; i++) {
		dot += a[i] * b[i];
		normA += a[i] * a[i];
		normB += b[i] * b[i];
	}
	const denom = Math.sqrt(normA) * Math.sqrt(normB);
	return denom === 0 ? 0 : dot / denom;
}

export async function getExistingContentHash(
	userId: string,
	contentType: string,
	contentKey: string,
): Promise<string | null> {
	const id = makeId(userId, contentType, contentKey);
	const row = await prisma.searchEmbedding.findUnique({
		where: { id },
		select: { contentHash: true },
	});
	return row?.contentHash ?? null;
}

export async function upsertEmbedding(entry: EmbeddingEntry): Promise<void> {
	const id = makeId(entry.userId, entry.contentType, entry.contentKey);
	const now = new Date().toISOString();

	await prisma.searchEmbedding.upsert({
		where: { id },
		create: {
			id,
			userId: entry.userId,
			contentType: entry.contentType,
			contentKey: entry.contentKey,
			owner: entry.owner,
			repo: entry.repo,
			itemNumber: entry.itemNumber,
			contentHash: entry.contentHash,
			embeddingJson: JSON.stringify(entry.embedding),
			title: entry.title,
			snippet: entry.snippet,
			metadataJson: entry.metadata ? JSON.stringify(entry.metadata) : null,
			createdAt: now,
			updatedAt: now,
		},
		update: {
			contentHash: entry.contentHash,
			embeddingJson: JSON.stringify(entry.embedding),
			title: entry.title,
			snippet: entry.snippet,
			metadataJson: entry.metadata ? JSON.stringify(entry.metadata) : null,
			updatedAt: now,
		},
	});
}

export async function searchEmbeddings(
	userId: string,
	queryEmbedding: number[],
	options: {
		owner?: string;
		repo?: string;
		topK?: number;
		contentTypes?: ContentType[];
	} = {},
): Promise<SearchResult[]> {
	const { owner, repo, topK = 30, contentTypes } = options;

	const where: Prisma.SearchEmbeddingWhereInput = { userId };
	if (owner) where.owner = owner;
	if (repo) where.repo = repo;
	if (contentTypes && contentTypes.length > 0) {
		where.contentType = { in: contentTypes };
	}

	const rows: SearchEmbedding[] = await prisma.searchEmbedding.findMany({ where });

	const scored: SearchResult[] = rows.map((row) => {
		const embedding = JSON.parse(row.embeddingJson) as number[];
		const similarity = cosineSimilarity(queryEmbedding, embedding);
		return {
			contentType: row.contentType as ContentType,
			contentKey: row.contentKey,
			owner: row.owner,
			repo: row.repo,
			itemNumber: row.itemNumber,
			title: row.title,
			snippet: row.snippet,
			metadata: row.metadataJson
				? (JSON.parse(row.metadataJson) as Record<string, unknown>)
				: null,
			similarity,
		};
	});

	scored.sort((a, b) => b.similarity - a.similarity);
	return scored.slice(0, topK);
}

export async function keywordSearch(
	userId: string,
	query: string,
	options: {
		owner?: string;
		repo?: string;
		topK?: number;
		contentTypes?: ContentType[];
	} = {},
): Promise<SearchResult[]> {
	const { owner, repo, topK = 20, contentTypes } = options;

	const where: Prisma.SearchEmbeddingWhereInput = { userId };
	if (owner) where.owner = owner;
	if (repo) where.repo = repo;
	if (contentTypes && contentTypes.length > 0) {
		where.contentType = { in: contentTypes };
	}

	const keywords = query
		.toLowerCase()
		.split(/\s+/)
		.filter((w) => w.length > 2);

	if (keywords.length > 0) {
		where.OR = keywords.flatMap((kw) => [
			{ title: { contains: kw, mode: "insensitive" as const } },
			{ snippet: { contains: kw, mode: "insensitive" as const } },
		]);
	}

	const rows: SearchEmbedding[] = await prisma.searchEmbedding.findMany({
		where,
		take: topK,
	});

	return rows.map(
		(row): SearchResult => ({
			contentType: row.contentType as ContentType,
			contentKey: row.contentKey,
			owner: row.owner,
			repo: row.repo,
			itemNumber: row.itemNumber,
			title: row.title,
			snippet: row.snippet,
			metadata: row.metadataJson
				? (JSON.parse(row.metadataJson) as Record<string, unknown>)
				: null,
			similarity: 0,
		}),
	);
}
