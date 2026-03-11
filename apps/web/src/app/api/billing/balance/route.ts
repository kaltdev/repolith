import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { getCreditBalance, getNearestCreditExpiry } from "@/lib/billing/credit";

export async function GET() {
	const session = await auth.api.getSession({ headers: await headers() });
	if (!session?.user?.id) {
		return new Response("Unauthorized", { status: 401 });
	}

	const [balance, nearestExpiry] = await Promise.all([
		getCreditBalance(session.user.id),
		getNearestCreditExpiry(session.user.id),
	]);
	return Response.json({
		...balance,
		nearestExpiry: nearestExpiry?.toISOString() ?? null,
	});
}
