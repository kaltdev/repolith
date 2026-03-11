import { Polar } from "@polar-sh/sdk";

export const isPolarEnabled = !!process.env.POLAR_ACCESS_TOKEN;

if (!isPolarEnabled) {
	console.warn("[billing] POLAR_ACCESS_TOKEN is not set — Polar features are disabled.");
}

let polarClient: Polar | null = null;

export function getPolarClient(): Polar {
	if (!polarClient) {
		polarClient = new Polar({
			accessToken: process.env.POLAR_ACCESS_TOKEN!,
			...(process.env.POLAR_SERVER === "sandbox" ? { server: "sandbox" } : {}),
		});
	}

	return polarClient;
}
