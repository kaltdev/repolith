import { MixedbreadAIClient } from "@mixedbread-ai/sdk";

const globalForMxb = globalThis as typeof globalThis & {
	__mxbClient?: MixedbreadAIClient;
};

function getClient(): MixedbreadAIClient {
	if (!globalForMxb.__mxbClient) {
		globalForMxb.__mxbClient = new MixedbreadAIClient({
			apiKey: `Bearer ${process.env.MIXEDBREAD_API_KEY!}`,
			environment: "https://api.mixedbread.com",
		});
	}
	return globalForMxb.__mxbClient;
}

const MAX_INPUT_CHARS = 32_000;

function truncate(text: string): string {
	return text.length > MAX_INPUT_CHARS ? text.slice(0, MAX_INPUT_CHARS) : text;
}

// The SDK types use broad unions (Embedding[] | MultipleEncodingsEmbedding[])
// but our calls always return float arrays. These narrow types match our usage.
interface FloatEmbeddingResponse {
	data: { embedding: number[]; index: number }[];
}

interface RerankResponse {
	data: { index: number; score: number }[];
}

export async function embedText(text: string): Promise<number[]> {
	const client = getClient();
	const res = await client.embeddings({
		model: "mixedbread-ai/mxbai-embed-large-v1",
		input: [truncate(text)],
		encodingFormat: "float",
	});
	return (res as unknown as FloatEmbeddingResponse).data[0].embedding;
}

export async function embedTexts(texts: string[]): Promise<number[][]> {
	const client = getClient();
	const res = await client.embeddings({
		model: "mixedbread-ai/mxbai-embed-large-v1",
		input: texts.map(truncate),
		encodingFormat: "float",
	});
	return (res as unknown as FloatEmbeddingResponse).data.map((d) => d.embedding);
}

export async function rerankResults(
	query: string,
	documents: { id: string; text: string }[],
	topK: number = 10,
): Promise<{ id: string; score: number }[]> {
	const client = getClient();
	const res = await client.reranking({
		model: "mixedbread-ai/mxbai-rerank-large-v1",
		query: truncate(query),
		input: documents.map((d) => d.text),
		topK,
		returnInput: false,
	});
	return (res as unknown as RerankResponse).data.map((r) => ({
		id: documents[r.index].id,
		score: r.score,
	}));
}
