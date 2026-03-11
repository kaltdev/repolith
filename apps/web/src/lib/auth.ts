import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./db";
import { Octokit } from "@octokit/rest";
import { redis } from "./redis";
import { waitUntil } from "@vercel/functions";
import { all } from "better-all";
import { headers } from "next/headers";
import { cache } from "react";
import { dash, sentinel } from "@better-auth/infra";
import { createHash } from "@better-auth/utils/hash";
import { admin, oAuthProxy } from "better-auth/plugins";
import { polar, checkout, portal, webhooks } from "@polar-sh/better-auth";
import { getPolarClient, isPolarEnabled } from "./billing/polar";
import { getPolarCreditPackProducts } from "./billing/credit-packs";
import {
	applyPolarRefundToCredits,
	grantCreditsForPaidPolarOrder,
} from "./billing/polar-purchase-grants";
import { patSignIn } from "./auth-plugins/pat-signin";

async function getOctokitUser(token: string) {
	const cached = await redis.get<ReturnType<(typeof octokit)["users"]["getAuthenticated"]>>(
		`github_user:${token}`,
	);
	if (cached) return cached;
	const octokit = new Octokit({ auth: token });
	const githubUser = await octokit.users.getAuthenticated();
	const hash = await createHash("SHA-256", "base64").digest(token);
	waitUntil(
		redis.set(`github_user:${hash}`, JSON.stringify(githubUser.data), {
			ex: 3600,
		}),
	);
	return githubUser;
}

export const auth = betterAuth({
	appName: "Repolith",
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	experimental: {
		// Enable to test the new session store based on Prisma instead of Redis.
		// Note: Prisma sessions don't support the cookie cache, so we disable it when enabled.
		joins: true,
	},
	plugins: [
		dash({
			activityTracking: {
				enabled: true,
			},
		}),
		sentinel(),
		admin(),
		patSignIn(),
		...(isPolarEnabled
			? [
					polar({
						client: getPolarClient(),
						createCustomerOnSignUp: true,
						use: [
							checkout({
								products: getPolarCreditPackProducts(),
								successUrl: "/settings?tab=billing&checkout_id={CHECKOUT_ID}",
								authenticatedUsersOnly: true,
							}),
							portal(),
							webhooks({
								secret: process.env
									.POLAR_WEBHOOK_SECRET!,
								onOrderPaid: async (payload) => {
									const { data } = payload;
									const productId =
										data.productId ??
										data.product?.id ??
										null;
									if (!productId) {
										throw new Error(
											`Polar order ${data.id} is missing a product id`,
										);
									}

									await grantCreditsForPaidPolarOrder(
										{
											polarOrderId:
												data.id,
											polarCheckoutId:
												data.checkoutId,
											polarCustomerId:
												data.customerId,
											polarExternalUserId:
												data
													.customer
													.externalId ??
												null,
											polarProductId:
												productId,
											amountPaidUsd:
												data.totalAmount /
												100,
											currency: data.currency,
											sourceEventType:
												payload.type,
											metadataJson:
												JSON.stringify(
													{
														orderId: data.id,
														checkoutId: data.checkoutId,
														productId,
														totalAmount:
															data.totalAmount,
														currency: data.currency,
													},
												),
										},
									);
								},
								onRefundCreated: async (
									payload,
								) => {
									if (
										payload.data
											.status !==
										"succeeded"
									)
										return;

									await applyPolarRefundToCredits(
										{
											polarRefundId:
												payload
													.data
													.id,
											polarOrderId:
												payload
													.data
													.orderId,
											polarCustomerId:
												payload
													.data
													.customerId,
											amountRefundedUsd:
												payload
													.data
													.amount /
												100,
											currency: payload
												.data
												.currency,
											refundStatus:
												payload
													.data
													.status,
											refundReason:
												payload
													.data
													.reason,
											sourceEventType:
												payload.type,
											metadataJson:
												JSON.stringify(
													{
														refundId: payload
															.data
															.id,
														orderId: payload
															.data
															.orderId,
														amount: payload
															.data
															.amount,
														currency: payload
															.data
															.currency,
														status: payload
															.data
															.status,
													},
												),
										},
									);
								},
								onRefundUpdated: async (
									payload,
								) => {
									if (
										payload.data
											.status !==
										"succeeded"
									)
										return;

									await applyPolarRefundToCredits(
										{
											polarRefundId:
												payload
													.data
													.id,
											polarOrderId:
												payload
													.data
													.orderId,
											polarCustomerId:
												payload
													.data
													.customerId,
											amountRefundedUsd:
												payload
													.data
													.amount /
												100,
											currency: payload
												.data
												.currency,
											refundStatus:
												payload
													.data
													.status,
											refundReason:
												payload
													.data
													.reason,
											sourceEventType:
												payload.type,
											metadataJson:
												JSON.stringify(
													{
														refundId: payload
															.data
															.id,
														orderId: payload
															.data
															.orderId,
														amount: payload
															.data
															.amount,
														currency: payload
															.data
															.currency,
														status: payload
															.data
															.status,
													},
												),
										},
									);
								},
							}),
						],
					}),
				]
			: []),
		...(process.env.VERCEL
			? [oAuthProxy({ productionURL: "https://www.repolith.my.id" })]
			: []),
	],
	user: {
		additionalFields: {
			githubPat: {
				type: "string",
				required: false,
			},
			onboardingDone: {
				type: "boolean",
				required: false,
			},
		},
		deleteUser: {
			enabled: true,
		},
	},
	account: {
		encryptOAuthTokens: true,
		//cache the account in the cookie
		storeAccountCookie: true,
		//to update scopes
		updateAccountOnSignIn: true,
	},
	socialProviders: {
		github: {
			clientId: process.env.GITHUB_CLIENT_ID!,
			clientSecret: process.env.GITHUB_CLIENT_SECRET!,
			// Minimal default — the sign-in UI lets users opt into more
			scope: ["read:user", "user:email", "public_repo"],
			async mapProfileToUser(profile) {
				return {
					githubLogin: profile.login,
				};
			},
		},
	},
	session: {
		cookieCache: {
			enabled: true,
			maxAge: 60 * 60 * 24 * 7,
			strategy: "jwe",
		},
	},
	trustedOrigins: [
		// Production
		"https://www.repolith.my.id",
		// Vercel preview
		"https://repolith-*-repolith.vercel.app",
		// Beta site
		"https://beta.repolith.my.id",
	],
	advanced: {
		ipAddress: {
			ipAddressHeaders: ["x-vercel-forwarded-for", "x-forwarded-for"],
		},
	},
});

export const getServerSession = cache(async () => {
	try {
		const { session, account } = await all({
			async session() {
				const session = await auth.api.getSession({
					headers: await headers(),
				});
				return session;
			},
			async account() {
				const session = await auth.api.getAccessToken({
					headers: await headers(),
					body: { providerId: "github" },
				});
				return session;
			},
		});
		if (!session || !account?.accessToken) {
			return null;
		}
		let githubUserData: Record<string, unknown> | null = null;
		try {
			const githubUser = await getOctokitUser(account.accessToken);
			githubUserData = githubUser?.data ?? null;
		} catch {
			// GitHub API may be rate-limited; don't treat as unauthenticated.
		}
		if (!githubUserData) {
			return {
				user: session.user,
				session,
				githubUser: { accessToken: account.accessToken } as any,
			};
		}
		return {
			user: session.user,
			session,
			githubUser: {
				...githubUserData,
				accessToken: account.accessToken,
			},
		};
	} catch {
		return null;
	}
});

export type $Session = NonNullable<Awaited<ReturnType<typeof getServerSession>>>;
