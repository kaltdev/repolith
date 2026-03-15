import Image from "next/image";
import Link from "next/link";
import { Eye, HardDrive, LinkIcon, Scale } from "lucide-react";
import { ForkButton } from "@/components/repo/fork-button";
import { ForkSyncButton } from "@/components/repo/fork-sync-button";
import { LatestCommitSection } from "@/components/repo/latest-commit-section";
import { PinButton } from "@/components/repo/pin-button";
import { RepoBadge, type RepoBadgeProps } from "@/components/repo/repo-badge";
import { RepoBreadcrumb } from "@/components/repo/repo-breadcrumb";
import { SidebarContributors } from "@/components/repo/sidebar-contributors";
import { SidebarLanguages } from "@/components/repo/sidebar-languages";
import { StarButton } from "@/components/repo/star-button";
import { TimeAgo } from "@/components/ui/time-ago";
import { formatBytes } from "@/lib/github-utils";
import { formatNumber } from "@/lib/utils";
import type { ForkSyncStatus } from "@/lib/github";
import type { ContributorAvatarsData } from "@/lib/repo-data-cache";

type RepoSidebarVariant = "panel" | "responsive" | "summary";

interface LatestCommit {
	sha: string;
	message: string;
	date: string;
	author: { login: string; avatarUrl: string } | null;
}

interface RepoSidebarProps {
	owner: string;
	repoName: string;
	ownerType: string;
	avatarUrl: string;
	description: string | null;
	stars: number;
	forks: number;
	watchers: number;
	openIssuesCount: number;
	isPrivate: boolean;
	defaultBranch: string;
	language: string | null;
	license: { name: string; spdx_id: string | null } | null;
	pushedAt: string;
	size: number;
	htmlUrl: string;
	homepage: string | null;
	topics: string[];
	archived: boolean;
	fork: boolean;
	parent: { fullName: string; owner: string; name: string } | null;
	initialContributors: ContributorAvatarsData | null;
	initialLanguages: Record<string, number> | null;
	latestCommit: LatestCommit | null;
	isStarred: boolean;
	disableForkButton?: boolean;
	isOwnFork?: boolean;
	forkSyncStatus?: ForkSyncStatus | null;
	isEmptyRepo?: boolean;
	variant?: RepoSidebarVariant;
}

export function RepoSidebar({
	owner,
	repoName,
	ownerType,
	avatarUrl,
	description,
	stars,
	forks,
	watchers,
	openIssuesCount,
	isPrivate,
	defaultBranch,
	language,
	license,
	pushedAt,
	size,
	htmlUrl: _htmlUrl,
	homepage,
	topics,
	archived,
	fork,
	parent,
	initialContributors,
	initialLanguages,
	latestCommit,
	isStarred,
	disableForkButton = false,
	isOwnFork,
	forkSyncStatus,
	isEmptyRepo = false,
	variant = "responsive",
}: RepoSidebarProps) {
	const badges: Array<RepoBadgeProps> = [
		{ type: isPrivate ? "private" : "public" },
		...(archived ? [{ type: "archived" } as const] : []),
		...(fork ? [{ type: "fork" } as const] : []),
		...(homepage ? [{ type: "website" as const, href: homepage }] : []),
	];
	const summaryMeta = [
		isPrivate ? "Private" : "Public",
		...(archived ? ["Archived"] : []),
		...(fork ? ["Fork"] : []),
	];

	const panelContent = (
		<div className="flex flex-col gap-5">
			<div className="flex flex-col gap-2">
				<RepoBreadcrumb
					owner={owner}
					repoName={repoName}
					ownerType={ownerType}
					ownerAvatarUrl={avatarUrl}
				/>
				<Image
					src={avatarUrl}
					alt=""
					width={160}
					height={160}
					className="w-32 aspect-square rounded-lg"
				/>
				{description && (
					<p className="text-xs text-muted-foreground leading-relaxed">
						{description}
					</p>
				)}
				<div className="flex flex-wrap gap-1.5">
					{badges.map((badge, index) => (
						<RepoBadge
							key={index}
							type={badge.type}
							href={badge.href}
							style="dashed"
						/>
					))}
				</div>
				{fork && parent && (
					<p className="text-[11px] text-muted-foreground/60">
						Forked from{" "}
						<Link
							href={`/${parent.owner}/${parent.name}`}
							className="text-muted-foreground hover:text-foreground transition-colors font-mono"
						>
							{parent.fullName}
						</Link>
					</p>
				)}
				{isOwnFork && fork && forkSyncStatus && (
					<ForkSyncButton
						owner={owner}
						repo={repoName}
						defaultBranch={defaultBranch}
						behind={forkSyncStatus.behind}
						parentFullName={parent?.fullName}
					/>
				)}
			</div>

			{!isEmptyRepo && (
				<LatestCommitSection
					owner={owner}
					repoName={repoName}
					initialCommit={latestCommit}
				/>
			)}

			{topics.length > 0 && (
				<div className="relative">
					<div className="flex gap-1.5 overflow-x-auto no-scrollbar">
						{topics.map((topic) => (
							<span
								key={topic}
								className="text-[10px] font-mono px-2 py-0.5 bg-muted text-muted-foreground rounded-full shrink-0"
							>
								{topic}
							</span>
						))}
					</div>
					<div className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none bg-gradient-to-l from-background to-transparent" />
				</div>
			)}

			<div className="flex flex-col gap-2">
				<StarButton
					owner={owner}
					repo={repoName}
					starred={isStarred}
					starCount={stars}
				/>
				<PinButton
					owner={owner}
					repo={repoName}
					language={language}
					stargazers_count={stars}
					isPrivate={isPrivate}
					avatarUrl={avatarUrl}
				/>
				<ForkButton
					owner={owner}
					repo={repoName}
					forkCount={forks}
					disabled={disableForkButton}
				/>
				<span className="flex items-center justify-center gap-1.5 text-[11px] font-mono text-muted-foreground/60">
					<Eye className="w-3 h-3" />
					Watchers
					<span className="tabular-nums">
						{formatNumber(watchers)}
					</span>
				</span>
			</div>

			<div className="flex flex-col gap-2">
				<span className="text-[9px] font-mono uppercase tracking-wider text-muted-foreground/70">
					Info
				</span>
				<div className="flex flex-col gap-1.5">
					{language && (
						<div className="flex items-center justify-between text-xs">
							<span className="text-muted-foreground/70">
								Language
							</span>
							<span className="font-mono text-muted-foreground">
								{language}
							</span>
						</div>
					)}
					{license && (
						<div className="flex items-center justify-between text-xs">
							<span className="flex items-center gap-1.5 text-muted-foreground/70">
								<Scale className="w-3 h-3" />
								License
							</span>
							<span className="font-mono text-muted-foreground">
								{license.spdx_id ?? license.name}
							</span>
						</div>
					)}
					<div className="flex items-center justify-between text-xs">
						<span className="text-muted-foreground/70">
							Last push
						</span>
						<span className="font-mono text-muted-foreground">
							<TimeAgo date={pushedAt} />
						</span>
					</div>
					{size > 0 && (
						<div className="flex items-center justify-between text-xs">
							<span className="flex items-center gap-1.5 text-muted-foreground/70">
								<HardDrive className="w-3 h-3" />
								Size
							</span>
							<span className="font-mono text-muted-foreground">
								{formatBytes(size * 1024)}
							</span>
						</div>
					)}
					{homepage && (
						<div className="flex items-center justify-between text-xs gap-3">
							<span className="flex items-center gap-1.5 text-muted-foreground/70 shrink-0">
								<LinkIcon className="w-3 h-3" />
								Homepage
							</span>
							<a
								href={homepage}
								target="_blank"
								rel="noopener noreferrer"
								className="font-mono text-muted-foreground hover:text-foreground transition-colors truncate max-w-[120px]"
							>
								{homepage.replace(
									/^https?:\/\//,
									"",
								)}
							</a>
						</div>
					)}
					{openIssuesCount > 0 && (
						<div className="flex items-center justify-between text-xs">
							<span className="text-muted-foreground/70">
								Open issues
							</span>
							<span className="font-mono text-muted-foreground">
								{formatNumber(openIssuesCount)}
							</span>
						</div>
					)}
				</div>
			</div>

			<SidebarLanguages
				owner={owner}
				repo={repoName}
				initialLanguages={initialLanguages}
			/>

			<SidebarContributors
				owner={owner}
				repo={repoName}
				initialData={initialContributors}
			/>
		</div>
	);

	const summaryContent = (
		<div className="min-w-0">
			<div className="flex min-w-0 items-center gap-2.5">
				<Image
					src={avatarUrl}
					alt={owner}
					width={20}
					height={20}
					className="size-5 shrink-0 rounded-sm"
				/>
				<div className="min-w-0 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm leading-none">
					<Link
						href={`/${owner}`}
						className="truncate text-muted-foreground transition-colors hover:text-foreground tracking-tight"
					>
						{owner}
					</Link>
					<span className="text-muted-foreground/30">/</span>
					<Link
						href={`/${owner}/${repoName}`}
						className="truncate font-medium text-foreground transition-colors hover:text-foreground/80 tracking-tight"
					>
						{repoName}
					</Link>
					{summaryMeta.length > 0 ? (
						<span className="hidden text-muted-foreground/25 sm:inline">
							•
						</span>
					) : null}
					{summaryMeta.map((item, index) => (
						<span
							key={index}
							className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground/55"
						>
							{item}
						</span>
					))}
				</div>
			</div>
		</div>
	);

	if (variant === "panel") {
		return panelContent;
	}

	if (variant === "summary") {
		return summaryContent;
	}

	return (
		<>
			<aside className="hidden lg:flex w-[260px] shrink-0 overflow-y-auto pt-0 pr-2 pl-8 pb-4 flex-col gap-5">
				{panelContent}
			</aside>
			<div className="block lg:hidden px-0">{summaryContent}</div>
		</>
	);
}
