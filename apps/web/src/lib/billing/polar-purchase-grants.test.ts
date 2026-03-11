import { describe, expect, it } from "vitest";

import { calculateIntendedReversalAmount, calculateRefundOutcome } from "./polar-purchase-grants";

describe("polar-purchase-grants", () => {
	it("applies a refund reversal without exceeding the available balance", () => {
		expect(calculateRefundOutcome(4, 6)).toEqual({
			appliedReversalAmountUsd: 4,
			unrecoveredAmountUsd: 2,
		});
	});

	it("fully applies a refund when the balance covers it", () => {
		expect(calculateRefundOutcome(10, 6)).toEqual({
			appliedReversalAmountUsd: 6,
			unrecoveredAmountUsd: 0,
		});
	});

	it("prorates refund intent based on granted credit value", () => {
		expect(
			calculateIntendedReversalAmount({
				grantedAmountUsd: 35,
				amountPaidUsd: 25,
				amountRefundedUsd: 10,
				previouslyIntendedReversedUsd: 0,
			}),
		).toBe(14);
	});

	it("caps the intended refund at the remaining grant value", () => {
		expect(
			calculateIntendedReversalAmount({
				grantedAmountUsd: 35,
				amountPaidUsd: 25,
				amountRefundedUsd: 10,
				previouslyIntendedReversedUsd: 32,
			}),
		).toBe(3);
	});

	it("returns zero when refund inputs are not billable", () => {
		expect(
			calculateIntendedReversalAmount({
				grantedAmountUsd: 0,
				amountPaidUsd: 25,
				amountRefundedUsd: 25,
				previouslyIntendedReversedUsd: 0,
			}),
		).toBe(0);
	});
});
