// ── Error Codes ──

export const BILLING_ERROR = {
	MESSAGE_LIMIT_REACHED: "MESSAGE_LIMIT_REACHED",
	CREDIT_EXHAUSTED: "CREDIT_EXHAUSTED",
	SPENDING_LIMIT_REACHED: "SPENDING_LIMIT_REACHED",
} as const;

export type BillingErrorCode = (typeof BILLING_ERROR)[keyof typeof BILLING_ERROR];

export function getBillingErrorCode(result: {
	creditExhausted?: boolean;
	spendingLimitReached?: boolean;
}): BillingErrorCode {
	if (result.creditExhausted) return BILLING_ERROR.CREDIT_EXHAUSTED;
	if (result.spendingLimitReached) return BILLING_ERROR.SPENDING_LIMIT_REACHED;
	return BILLING_ERROR.MESSAGE_LIMIT_REACHED;
}

// ── Credit Packs ──

export const USD_PER_CREDIT = 0.01;
export const CREDITS_PER_USD = 100;

export const POLAR_PURCHASE_CREDIT_TYPE = "polar_purchase_credit";
export const POLAR_REFUND_REVERSAL_TYPE = "polar_refund_reversal";
export const POLAR_REFUND_DEFICIT_TYPE = "polar_refund_deficit";

// ── Fixed Costs ──

export const FIXED_COSTS = {
	// E2B sandbox session
	// Currently disabled, only AI model usage is billed
	sandbox: 0,
} as const;

// ── Spending Limit ──

export const MIN_CAP_USD = 0.01;

// ── Polar ──

/**
 * Polar payment gateway configuration.
 * Set POLAR_ACCESS_TOKEN, POLAR_WEBHOOK_SECRET, and the POLAR_CREDITS_*_PRODUCT_ID
 * environment variables to enable Polar as a payment gateway.
 * Optionally set POLAR_SERVER=sandbox for testing.
 */
export const POLAR_ENABLED_ENV_KEY = "POLAR_ACCESS_TOKEN";
