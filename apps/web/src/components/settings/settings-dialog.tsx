"use client";

import { useCallback, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useResponsiveSurfaceContext } from "@/components/shared/responsive-surface-provider";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import * as VisuallyHidden from "@radix-ui/react-visually-hidden";
import { SettingsContent } from "./settings-content";
import type { TabId } from "./settings-content";
import type { UserSettings } from "@/lib/user-settings-store";

export interface GitHubProfile {
	login: string;
	avatar_url: string;
	bio: string | null;
	company: string | null;
	location: string | null;
	blog: string | null;
	twitter_username: string | null;
	public_repos: number;
	followers: number;
	following: number;
	created_at: string;
}

interface SettingsDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialTab?: TabId;
	user: { name: string; email: string; image: string | null };
	githubProfile: GitHubProfile;
}

async function fetchUserSettings(): Promise<UserSettings> {
	const response = await fetch("/api/user-settings");
	if (!response.ok) {
		throw new Error("Failed to fetch user settings");
	}
	const data: unknown = await response.json();
	if (!data || typeof data !== "object") {
		throw new Error("Invalid settings response");
	}
	return data as UserSettings;
}

export function SettingsDialog({
	open,
	onOpenChange,
	initialTab,
	user,
	githubProfile,
}: SettingsDialogProps) {
	const { viewport } = useResponsiveSurfaceContext();
	const isCompactViewport = viewport !== "desktop";
	const {
		data: settings,
		isPending,
		isError,
		refetch,
	} = useQuery({
		queryKey: ["user-settings"],
		queryFn: fetchUserSettings,
		enabled: open,
		staleTime: 5 * 60 * 1000,
		gcTime: 15 * 60 * 1000,
	});

	const [isThemeTransitioning, setIsThemeTransitioning] = useState(false);
	const transitionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const onThemeTransition = useCallback(() => {
		if (transitionTimeoutRef.current) {
			clearTimeout(transitionTimeoutRef.current);
		}
		setIsThemeTransitioning(true);
		transitionTimeoutRef.current = setTimeout(() => {
			setIsThemeTransitioning(false);
		}, 1000);
	}, []);

	const handleInteractOutside = useCallback(
		(e: Event) => {
			if (isThemeTransitioning) {
				e.preventDefault();
			}
		},
		[isThemeTransitioning],
	);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className={
					viewport === "phone"
						? "h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-none gap-0 overflow-hidden p-0 outline-none"
						: viewport === "tablet" || viewport === "wideTablet"
							? "max-h-[calc(100dvh-2rem)] w-[min(48rem,calc(100vw-2rem))] max-w-none gap-0 overflow-hidden p-0 outline-none"
							: "max-h-[85vh] gap-0 overflow-hidden p-0 outline-none sm:max-w-2xl"
				}
				showCloseButton={false}
				onPointerDownOutside={handleInteractOutside}
				onInteractOutside={handleInteractOutside}
			>
				<VisuallyHidden.Root>
					<DialogTitle>Settings</DialogTitle>
				</VisuallyHidden.Root>
				<div
					className={
						isCompactViewport
							? "flex min-h-0 h-full flex-col"
							: "flex min-h-[26rem] max-h-[85vh] flex-col"
					}
				>
					{settings && !isError ? (
						<SettingsContent
							key={initialTab}
							initialSettings={settings}
							initialTab={initialTab}
							user={user}
							githubProfile={githubProfile}
							onThemeTransition={onThemeTransition}
						/>
					) : (
						<div className="flex-1 flex items-center justify-center px-6">
							{isError ? (
								<div className="text-center space-y-3">
									<p className="text-xs font-mono text-muted-foreground">
										Failed to load
										settings.
									</p>
									<button
										type="button"
										onClick={() =>
											void refetch()
										}
										className="border border-border px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/50 dark:hover:bg-white/[0.04] transition-colors cursor-pointer"
									>
										Retry
									</button>
								</div>
							) : (
								<p className="text-xs font-mono text-muted-foreground">
									{isPending
										? "Loading settings..."
										: "Preparing settings..."}
								</p>
							)}
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
