import { CREDITS_PER_USD, USD_PER_CREDIT } from "./config";

export type CreditPackSlug = "credit_pack_small" | "credit_pack_medium" | "credit_pack_large";

export interface CreditPackDefinition {
	slug: CreditPackSlug;
	name: string;
	description: string;
	envKey: string;
	priceUsd: number;
	credits: number;
	grantedAmountUsd: number;
}

export interface ConfiguredCreditPack extends CreditPackDefinition {
	productId: string | null;
}

export const CREDIT_PACK_DEFINITIONS: readonly CreditPackDefinition[] = [
	{
		slug: "credit_pack_small",
		name: "Small Pack",
		description: "$5 for 500 credits",
		envKey: "POLAR_CREDITS_SMALL_PRODUCT_ID",
		priceUsd: 5,
		credits: 500,
		grantedAmountUsd: 5,
	},
	{
		slug: "credit_pack_medium",
		name: "Medium Pack",
		description: "$10 for 1200 credits",
		envKey: "POLAR_CREDITS_MEDIUM_PRODUCT_ID",
		priceUsd: 10,
		credits: 1200,
		grantedAmountUsd: 12,
	},
	{
		slug: "credit_pack_large",
		name: "Large Pack",
		description: "$25 for 3500 credits",
		envKey: "POLAR_CREDITS_LARGE_PRODUCT_ID",
		priceUsd: 25,
		credits: 3500,
		grantedAmountUsd: 35,
	},
] as const;

export function creditsToUsd(credits: number): number {
	return credits * USD_PER_CREDIT;
}

export function usdToCredits(amountUsd: number): number {
	return Math.round(amountUsd * CREDITS_PER_USD);
}

export function getCreditPackCatalog(): ConfiguredCreditPack[] {
	return CREDIT_PACK_DEFINITIONS.map((pack) => ({
		...pack,
		productId: process.env[pack.envKey]?.trim() || null,
	}));
}

export function getPolarCreditPackProducts() {
	return getCreditPackCatalog()
		.filter((pack) => pack.productId)
		.map((pack) => ({
			productId: pack.productId!,
			slug: pack.slug,
		}));
}

export function getConfiguredCreditPackBySlug(slug: string): ConfiguredCreditPack | null {
	return getCreditPackCatalog().find((pack) => pack.slug === slug) ?? null;
}

export function getConfiguredCreditPackByProductId(
	productId: string | null | undefined,
): ConfiguredCreditPack | null {
	if (!productId) return null;
	return getCreditPackCatalog().find((pack) => pack.productId === productId) ?? null;
}
