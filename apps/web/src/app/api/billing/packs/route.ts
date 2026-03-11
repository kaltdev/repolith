import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCreditPackCatalog } from "@/lib/billing/credit-packs";
import { isPolarEnabled } from "@/lib/billing/polar";

export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.id) {
		return Response.json({ error: "Unauthorized" }, { status: 401 });
	}

	return Response.json({
		polarEnabled: isPolarEnabled,
		packs: getCreditPackCatalog().map((pack) => ({
			slug: pack.slug,
			name: pack.name,
			description: pack.description,
			priceUsd: pack.priceUsd,
			credits: pack.credits,
			grantedAmountUsd: pack.grantedAmountUsd,
			available: !!pack.productId,
		})),
	});
}
