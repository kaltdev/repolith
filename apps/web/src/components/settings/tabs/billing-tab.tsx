"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, ExternalLink, Key } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import type { UserSettings } from "@/lib/user-settings-store";

interface BillingTabProps {
	settings: UserSettings;
	onNavigate: (tab: "general" | "editor" | "ai" | "billing" | "account") => void;
}

interface BalanceData {
	totalGranted: number;
	totalUsed: number;
	available: number;
	nearestExpiry: string | null;
}

interface SpendingLimitData {
	mode: "credit";
	monthlyCapUsd?: number | null;
	periodUsageUsd?: number;
	periodStart?: string;
	remainingUsd?: number | null;
	available?: number;
	totalGranted?: number;
}

interface CreditPackData {
	slug: string;
	name: string;
	description: string;
	priceUsd: number;
	credits: number;
	grantedAmountUsd: number;
	available: boolean;
}

interface BillingPacksData {
	polarEnabled: boolean;
	packs: CreditPackData[];
}

function usdToCredits(amountUsd: number): number {
	return Math.round(amountUsd * 100);
}

function formatUsd(amount: number): string {
	return `$${amount.toFixed(2)}`;
}

function formatDate(date: string | Date): string {
	return new Date(date).toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
}

async function fetchBalance(): Promise<BalanceData> {
	const res = await fetch("/api/billing/balance");
	if (!res.ok) throw new Error("Failed to load balance");
	return res.json();
}

async function fetchSpendingLimit(): Promise<SpendingLimitData> {
	const res = await fetch("/api/billing/spending-limit");
	if (!res.ok) throw new Error("Failed to load spending limit");
	return res.json();
}

async function fetchPacks(): Promise<BillingPacksData> {
	const res = await fetch("/api/billing/packs");
	if (!res.ok) throw new Error("Failed to load credit packs");
	return res.json();
}

async function patchSpendingLimit(value: number | null) {
	const res = await fetch("/api/billing/spending-limit", {
		method: "PATCH",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ monthlyCapUsd: value }),
	});
	if (!res.ok) {
		const data = await res.json();
		throw new Error(data.error ?? "Failed to update");
	}
	return res.json();
}

export function BillingTab({ settings, onNavigate }: BillingTabProps) {
	const {
		data: balance,
		isLoading: balanceLoading,
		error: balanceError,
	} = useQuery({
		queryKey: ["billing-balance"],
		queryFn: fetchBalance,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
		refetchOnMount: "always",
		refetchOnWindowFocus: "always",
	});

	const {
		data: spendingLimit,
		isLoading: spendingLoading,
		error: spendingError,
	} = useQuery({
		queryKey: ["billing-spending-limit"],
		queryFn: fetchSpendingLimit,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
		refetchOnMount: "always",
		refetchOnWindowFocus: "always",
	});

	const {
		data: packsData,
		isLoading: packsLoading,
		error: packsError,
	} = useQuery({
		queryKey: ["billing-packs"],
		queryFn: fetchPacks,
		staleTime: 30_000,
		gcTime: 5 * 60_000,
		refetchOnMount: "always",
		refetchOnWindowFocus: "always",
		retry: false,
	});

	const queryClient = useQueryClient();
	const invalidateBilling = () =>
		Promise.all([
			queryClient.invalidateQueries({ queryKey: ["billing-balance"] }),
			queryClient.invalidateQueries({ queryKey: ["billing-spending-limit"] }),
		]);

	const limitMutation = useMutation({
		mutationFn: patchSpendingLimit,
		onSuccess: () => invalidateBilling(),
	});

	const [checkoutSlug, setCheckoutSlug] = useState<string | null>(null);
	const [limitDialogOpen, setLimitDialogOpen] = useState(false);
	const [limitEnabled, setLimitEnabled] = useState(false);
	const [limitAmount, setLimitAmount] = useState("10.00");

	const loading = balanceLoading || spendingLoading || packsLoading;
	const error = balanceError ?? spendingError ?? packsError ?? limitMutation.error;

	function openLimitDialog() {
		const cap = spendingLimit?.monthlyCapUsd;
		if (cap !== null && cap !== undefined) {
			setLimitEnabled(true);
			setLimitAmount(Number(cap).toFixed(2));
		} else {
			setLimitEnabled(false);
			setLimitAmount("10.00");
		}
		setLimitDialogOpen(true);
	}

	function handleLimitSave() {
		if (!limitEnabled) {
			limitMutation.mutate(null, {
				onSuccess: () => setLimitDialogOpen(false),
			});
			return;
		}

		const parsed = parseFloat(limitAmount);
		if (!Number.isFinite(parsed) || parsed < 0.01) {
			setLimitAmount("0.01");
			limitMutation.mutate(0.01, {
				onSuccess: () => setLimitDialogOpen(false),
			});
			return;
		}

		setLimitAmount(parsed.toFixed(2));
		limitMutation.mutate(parsed, {
			onSuccess: () => setLimitDialogOpen(false),
		});
	}

	async function handleCheckout(slug: string) {
		setCheckoutSlug(slug);
		try {
			const res = await (authClient as any).checkout({ slug });
			if (res?.data?.url) {
				window.location.href = res.data.url;
			}
		} catch {
			console.error("[billing] Polar checkout not available");
		} finally {
			setCheckoutSlug(null);
		}
	}

	if (loading) {
		return (
			<div className="px-4 py-12 flex items-center justify-center">
				<span className="text-[10px] font-mono text-muted-foreground/50">
					Loading billing...
				</span>
			</div>
		);
	}

	if (error || !balance || !spendingLimit || !packsData) {
		return (
			<div className="px-4 py-12 flex flex-col items-center text-center">
				<p className="text-xs font-mono text-destructive">
					{error instanceof Error
						? error.message
						: "Failed to load billing data"}
				</p>
			</div>
		);
	}

	const usageAmount = spendingLimit.periodUsageUsd ?? 0;
	const usageCredits = usdToCredits(usageAmount);
	const capUsd = spendingLimit.monthlyCapUsd;
	const capCredits = capUsd != null ? usdToCredits(capUsd) : null;
	const usagePct =
		capUsd != null && capUsd > 0
			? Math.min(100, Math.round((usageAmount / capUsd) * 100))
			: null;
	const availableCredits = usdToCredits(balance.available);
	const totalGrantedCredits = usdToCredits(balance.totalGranted);
	const totalUsedCredits = usdToCredits(balance.totalUsed);
	const hasByok = settings.useOwnApiKey && !!settings.openrouterApiKey;

	return (
		<div className="divide-y divide-border">
			<div className="px-4 py-4">
				<label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
					Buy Credits
				</label>
				<p className="mt-1 text-[10px] font-mono text-muted-foreground/50">
					Purchases are prepaid. Credits are granted after Polar
					confirms payment.
				</p>
				{!packsData.polarEnabled && (
					<div className="mt-3 flex items-start gap-2 rounded border border-destructive/20 bg-destructive/5 px-3 py-2.5">
						<AlertCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />
						<p className="text-[11px] font-mono text-destructive/80">
							Polar billing is not configured in this
							environment.
						</p>
					</div>
				)}
				<div className="mt-4 grid gap-3 lg:grid-cols-3">
					{packsData.packs.map((pack) => {
						const isLoadingPack = checkoutSlug === pack.slug;
						return (
							<div
								key={pack.slug}
								className="border border-border px-3 py-3"
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<p className="text-sm font-mono">
											{pack.name}
										</p>
										<p className="mt-1 text-[10px] font-mono text-muted-foreground/50">
											{pack.credits.toLocaleString()}{" "}
											credits
										</p>
									</div>
									<div className="text-right">
										<p className="text-sm font-mono">
											{formatUsd(
												pack.priceUsd,
											)}
										</p>
										<p className="text-[10px] font-mono text-muted-foreground/50">
											{formatUsd(
												pack.grantedAmountUsd,
											)}{" "}
											usage value
										</p>
									</div>
								</div>
								<p className="mt-2 text-[10px] font-mono text-muted-foreground/70">
									{pack.description}
								</p>
								<button
									type="button"
									onClick={() =>
										handleCheckout(
											pack.slug,
										)
									}
									disabled={
										!packsData.polarEnabled ||
										!pack.available ||
										isLoadingPack
									}
									className="mt-4 flex items-center justify-center gap-1.5 border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed w-full"
								>
									{isLoadingPack
										? "Redirecting..."
										: "Buy credits"}
								</button>
							</div>
						);
					})}
				</div>
			</div>

			<div className="px-4 py-4">
				<label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
					Credit Balance
				</label>
				<div className="mt-3 flex flex-wrap items-end justify-between gap-3">
					<div>
						<p className="text-lg font-mono tabular-nums">
							{availableCredits.toLocaleString()} credits
						</p>
						<p className="mt-1 text-[10px] font-mono text-muted-foreground/50">
							{formatUsd(balance.available)} available
						</p>
					</div>
					<div className="text-right">
						<p className="text-[10px] font-mono text-muted-foreground/50">
							Granted{" "}
							{totalGrantedCredits.toLocaleString()}{" "}
							credits
						</p>
						<p className="mt-1 text-[10px] font-mono text-muted-foreground/50">
							Used {totalUsedCredits.toLocaleString()}{" "}
							credits
						</p>
					</div>
				</div>
				{balance.nearestExpiry && (
					<p className="mt-2 text-[10px] font-mono text-muted-foreground/50">
						Next expiry {formatDate(balance.nearestExpiry)}
					</p>
				)}
			</div>

			<div className="px-4 py-4">
				<label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
					Usage
				</label>
				<div className="mt-2 flex items-baseline justify-between">
					<div>
						<span className="text-lg font-mono tabular-nums">
							{usageCredits.toLocaleString()} credits
						</span>
						<span className="text-[10px] text-muted-foreground/50 font-mono ml-1.5">
							used this month
						</span>
					</div>
					{usagePct !== null && (
						<span className="text-[10px] font-mono tabular-nums text-muted-foreground">
							{usagePct}%
						</span>
					)}
				</div>
				<p className="mt-1 text-[10px] text-muted-foreground/50 font-mono">
					{formatUsd(usageAmount)} used since{" "}
					{spendingLimit.periodStart
						? formatDate(spendingLimit.periodStart)
						: "this month"}
					.
				</p>
				{usagePct !== null && (
					<div className="mt-2 h-1.5 w-full bg-muted/50 dark:bg-white/[0.06] rounded-full overflow-hidden">
						<div
							className={cn(
								"h-full rounded-full transition-all",
								usagePct >= 90
									? "bg-destructive"
									: "bg-foreground/80",
							)}
							style={{ width: `${usagePct}%` }}
						/>
					</div>
				)}
				<div className="mt-4 flex flex-col gap-2 border-t border-border/50 pt-3 sm:flex-row sm:items-center sm:justify-between">
					<p className="text-xs font-mono text-muted-foreground">
						Monthly spend limit:{" "}
						<span className="text-foreground">
							{capUsd != null
								? `${capCredits?.toLocaleString()} credits (${formatUsd(capUsd)})`
								: "No limit"}
						</span>
					</p>
					<button
						type="button"
						onClick={openLimitDialog}
						className="text-[10px] font-mono text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors cursor-pointer"
					>
						Adjust limit
					</button>
				</div>

				<Dialog open={limitDialogOpen} onOpenChange={setLimitDialogOpen}>
					<DialogContent className="sm:max-w-sm">
						<DialogHeader>
							<DialogTitle className="text-sm font-mono">
								Spending Limit
							</DialogTitle>
							<DialogDescription className="text-xs font-mono">
								Set a maximum monthly budget for
								app-funded usage. The most recent
								request can slightly exceed this
								limit.
							</DialogDescription>
						</DialogHeader>
						<div className="space-y-3 py-2">
							<label className="flex items-center gap-2.5 cursor-pointer">
								<span
									className={cn(
										"w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0",
										!limitEnabled
											? "border-foreground"
											: "border-muted-foreground/30",
									)}
								>
									{!limitEnabled && (
										<span className="w-1.5 h-1.5 rounded-full bg-foreground" />
									)}
								</span>
								<input
									type="radio"
									name="spending-limit"
									checked={!limitEnabled}
									onChange={() =>
										setLimitEnabled(
											false,
										)
									}
									className="sr-only"
								/>
								<span className="text-xs font-mono">
									No limit
								</span>
							</label>
							<label className="flex items-center gap-2.5 cursor-pointer">
								<span
									className={cn(
										"w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0",
										limitEnabled
											? "border-foreground"
											: "border-muted-foreground/30",
									)}
								>
									{limitEnabled && (
										<span className="w-1.5 h-1.5 rounded-full bg-foreground" />
									)}
								</span>
								<input
									type="radio"
									name="spending-limit"
									checked={limitEnabled}
									onChange={() =>
										setLimitEnabled(
											true,
										)
									}
									className="sr-only"
								/>
								<span className="flex items-center gap-1.5 text-xs font-mono">
									<span className="text-muted-foreground">
										$
									</span>
									<input
										type="text"
										inputMode="decimal"
										value={limitAmount}
										onFocus={() =>
											setLimitEnabled(
												true,
											)
										}
										onChange={(e) => {
											setLimitEnabled(
												true,
											);
											setLimitAmount(
												e
													.target
													.value,
											);
										}}
										className="w-16 border border-border px-1.5 py-0.5 text-xs font-mono tabular-nums bg-transparent outline-none focus:border-foreground/30"
									/>
									<span className="text-muted-foreground/50">
										per month
									</span>
								</span>
							</label>
						</div>
						<DialogFooter>
							<button
								type="button"
								onClick={() =>
									setLimitDialogOpen(false)
								}
								className="border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
							>
								Cancel
							</button>
							<button
								type="button"
								onClick={handleLimitSave}
								disabled={limitMutation.isPending}
								className="border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{limitMutation.isPending
									? "Saving..."
									: "Save"}
							</button>
						</DialogFooter>
					</DialogContent>
				</Dialog>
			</div>

			<div className="px-4 py-4">
				<label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
					<Key className="w-3 h-3" />
					API Key
				</label>
				<p className="mt-1 text-[10px] text-muted-foreground/50 font-mono">
					{hasByok
						? "Your OpenRouter API key is active. AI requests are billed to your OpenRouter account."
						: "No API key configured. AI requests use your available prepaid credits."}
				</p>
				{!hasByok && (
					<button
						type="button"
						onClick={() => onNavigate("ai")}
						className="mt-2 text-[10px] font-mono text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors cursor-pointer"
					>
						Configure in AI / Model settings
					</button>
				)}
			</div>

			{packsData.polarEnabled && (
				<div className="px-4 py-4">
					<label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
						Manage
					</label>
					<p className="mt-1 text-[10px] text-muted-foreground/50 font-mono">
						View invoices, receipts, and payment details in
						Polar.
					</p>
					<button
						type="button"
						onClick={async () => {
							try {
								const res = await (
									authClient as any
								).customer.portal();
								if (res?.data?.url) {
									window.location.href =
										res.data.url;
								}
							} catch {
								console.error(
									"[billing] Polar customer portal not available",
								);
							}
						}}
						className="mt-2 flex items-center gap-1.5 border border-border px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
					>
						<ExternalLink className="w-3 h-3" />
						Open billing portal
					</button>
				</div>
			)}
		</div>
	);
}
