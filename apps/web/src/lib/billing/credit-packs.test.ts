import { afterEach, describe, expect, it } from "vitest";

import {
	creditsToUsd,
	getConfiguredCreditPackByProductId,
	getCreditPackCatalog,
	getPolarCreditPackProducts,
	usdToCredits,
} from "./credit-packs";

const ORIGINAL_SMALL = process.env.POLAR_CREDITS_SMALL_PRODUCT_ID;
const ORIGINAL_MEDIUM = process.env.POLAR_CREDITS_MEDIUM_PRODUCT_ID;
const ORIGINAL_LARGE = process.env.POLAR_CREDITS_LARGE_PRODUCT_ID;

afterEach(() => {
	restoreEnv("POLAR_CREDITS_SMALL_PRODUCT_ID", ORIGINAL_SMALL);
	restoreEnv("POLAR_CREDITS_MEDIUM_PRODUCT_ID", ORIGINAL_MEDIUM);
	restoreEnv("POLAR_CREDITS_LARGE_PRODUCT_ID", ORIGINAL_LARGE);
});

function restoreEnv(key: string, value: string | undefined) {
	if (value === undefined) {
		delete process.env[key];
		return;
	}

	process.env[key] = value;
}

describe("credit-packs", () => {
	it("converts between USD-equivalent value and credits", () => {
		expect(creditsToUsd(500)).toBe(5);
		expect(usdToCredits(12)).toBe(1200);
	});

	it("returns the configured Polar products for checkout", () => {
		process.env.POLAR_CREDITS_SMALL_PRODUCT_ID = "prod_small";
		process.env.POLAR_CREDITS_MEDIUM_PRODUCT_ID = "prod_medium";
		delete process.env.POLAR_CREDITS_LARGE_PRODUCT_ID;

		expect(getPolarCreditPackProducts()).toEqual([
			{ productId: "prod_small", slug: "credit_pack_small" },
			{ productId: "prod_medium", slug: "credit_pack_medium" },
		]);
	});

	it("resolves a configured pack by Polar product id", () => {
		process.env.POLAR_CREDITS_SMALL_PRODUCT_ID = "prod_small";

		expect(getConfiguredCreditPackByProductId("prod_small")).toMatchObject({
			slug: "credit_pack_small",
			priceUsd: 5,
			credits: 500,
			grantedAmountUsd: 5,
		});
		expect(getConfiguredCreditPackByProductId("missing")).toBeNull();
	});

	it("marks which packs are available in the catalog", () => {
		process.env.POLAR_CREDITS_SMALL_PRODUCT_ID = "prod_small";
		delete process.env.POLAR_CREDITS_MEDIUM_PRODUCT_ID;
		process.env.POLAR_CREDITS_LARGE_PRODUCT_ID = "prod_large";

		expect(
			getCreditPackCatalog().map((pack) => ({
				slug: pack.slug,
				available: !!pack.productId,
			})),
		).toEqual([
			{ slug: "credit_pack_small", available: true },
			{ slug: "credit_pack_medium", available: false },
			{ slug: "credit_pack_large", available: true },
		]);
	});
});
