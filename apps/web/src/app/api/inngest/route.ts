import { serve } from "inngest/next";
import { inngest, embedContent } from "@/lib/inngest";

export const { GET, POST, PUT } = serve({
	client: inngest,
	functions: [embedContent],
});
