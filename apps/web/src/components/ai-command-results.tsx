"use client";

import {
	AlertTriangle,
	Check,
	ExternalLink,
	FolderGit2,
	GitFork,
	Loader2,
	Star,
	X,
} from "lucide-react";
import type { ComponentProps } from "react";
import ReactMarkdown from "react-markdown";
import { cn, formatNumber } from "@/lib/utils";
import { getLanguageColor } from "@/lib/github-utils";
import { TimeAgo } from "@/components/ui/time-ago";
import { useSession } from "@/lib/auth-client";

// ─── Tool Loading Indicator ────────────────────────────────────────────────────

const toolLabels: Record<string, string> = {
	searchRepos: "Searching repos",
	searchUsers: "Searching users",
	getRepoInfo: "Fetching repo info",
	starRepo: "Starring repo",
	unstarRepo: "Unstarring repo",
	forkRepo: "Forking repo",
	watchRepo: "Watching repo",
	unwatchRepo: "Unwatching repo",
	createIssue: "Creating issue",
	closeIssue: "Closing issue",
	listIssues: "Listing issues",
	listPullRequests: "Listing PRs",
	mergePullRequest: "Merging PR",
	getUserProfile: "Fetching profile",
	followUser: "Following user",
	unfollowUser: "Unfollowing user",
	listNotifications: "Loading notifications",
	markNotificationsRead: "Marking read",
	createGist: "Creating gist",
	navigateTo: "Navigating",
	openRepo: "Opening repo",
	openUrl: "Opening link",
};

export function ToolLoading({ toolName }: { toolName: string }) {
	return (
		<div className="flex items-center gap-2 py-1 text-xs text-muted-foreground/60">
			<Loader2 className="size-3 animate-spin" />
			<span className="font-mono">{toolLabels[toolName] || toolName}...</span>
		</div>
	);
}

// ─── Repo Search Results ──────────────────────────────────────────────────────

interface RepoResult {
	full_name: string;
	description: string | null;
	stargazers_count: number;
	forks_count: number;
	language: string | null;
	updated_at: string | null;
	owner_avatar?: string;
}

export function RepoSearchResults({
	output,
	onNavigate,
}: {
	output: { repos?: RepoResult[]; total_count?: number };
	onNavigate?: (fullName: string) => void;
}) {
	const repos = output.repos;
	if (!repos?.length) {
		return (
			<div className="text-xs text-muted-foreground/60 py-2 font-mono">
				No repositories found
			</div>
		);
	}

	return (
		<div className="border border-border/40 dark:border-white/6 rounded-md overflow-hidden my-2">
			<div className="px-3 py-1.5 bg-muted/30 dark:bg-white/[0.02] border-b border-border/40 dark:border-white/6">
				<span className="text-[11px] font-mono text-muted-foreground/60">
					{output.total_count !== undefined
						? `${formatNumber(output.total_count)} repos found`
						: `${repos.length} repos`}
				</span>
			</div>
			<div className="divide-y divide-border/30 dark:divide-white/4">
				{repos.map((repo) => (
					<button
						key={repo.full_name}
						type="button"
						onClick={() => onNavigate?.(repo.full_name)}
						className="w-full text-left px-3 py-2 hover:bg-muted/30 dark:hover:bg-white/3 transition-colors cursor-pointer"
					>
						<div className="flex items-center gap-2">
							{repo.owner_avatar ? (
								<img
									src={repo.owner_avatar}
									alt=""
									className="size-4 rounded-full shrink-0"
								/>
							) : (
								<FolderGit2 className="size-3.5 text-muted-foreground/60 shrink-0" />
							)}
							<span className="text-sm font-mono text-foreground truncate">
								{repo.full_name}
							</span>
						</div>
						{repo.description && (
							<p className="text-[11px] text-muted-foreground/60 mt-0.5 truncate pl-6">
								{repo.description}
							</p>
						)}
						<div className="flex items-center gap-3 mt-1 pl-6">
							{repo.language && (
								<span className="flex items-center gap-1 text-[10px] text-muted-foreground/60 font-mono">
									<span
										className="size-1.5 rounded-full"
										style={{
											backgroundColor:
												getLanguageColor(
													repo.language,
												),
										}}
									/>
									{repo.language}
								</span>
							)}
							{repo.stargazers_count > 0 && (
								<span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
									<Star className="size-2.5" />
									{formatNumber(
										repo.stargazers_count,
									)}
								</span>
							)}
							{repo.forks_count > 0 && (
								<span className="flex items-center gap-0.5 text-[10px] text-muted-foreground/60">
									<GitFork className="size-2.5" />
									{formatNumber(
										repo.forks_count,
									)}
								</span>
							)}
							{repo.updated_at && (
								<span className="text-[10px] text-muted-foreground/60 font-mono">
									<TimeAgo
										date={
											repo.updated_at
										}
									/>
								</span>
							)}
						</div>
					</button>
				))}
			</div>
		</div>
	);
}

// ─── User Search Results ──────────────────────────────────────────────────────

interface UserResult {
	login: string;
	avatar_url: string;
	type: string;
	html_url: string;
}

export function UserSearchResults({
	output,
	onOpenUrl,
}: {
	output: { users?: UserResult[]; total_count?: number };
	onOpenUrl?: (url: string) => void;
}) {
	const users = output.users;
	if (!users?.length) {
		return (
			<div className="text-xs text-muted-foreground/60 py-2 font-mono">
				No users found
			</div>
		);
	}

	return (
		<div className="border border-border/40 dark:border-white/6 rounded-md overflow-hidden my-2">
			<div className="px-3 py-1.5 bg-muted/30 dark:bg-white/[0.02] border-b border-border/40 dark:border-white/6">
				<span className="text-[11px] font-mono text-muted-foreground/60">
					{output.total_count !== undefined
						? `${formatNumber(output.total_count)} users found`
						: `${users.length} users`}
				</span>
			</div>
			<div className="divide-y divide-border/30 dark:divide-white/4">
				{users.map((user) => (
					<button
						key={user.login}
						type="button"
						onClick={() => onOpenUrl?.(user.html_url)}
						className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-muted/30 dark:hover:bg-white/3 transition-colors cursor-pointer text-left"
					>
						<img
							src={user.avatar_url}
							alt={user.login}
							className="size-6 rounded-full shrink-0"
						/>
						<span className="text-sm font-mono text-foreground">
							{user.login}
						</span>
						<span className="text-[10px] text-muted-foreground/60 font-mono">
							{user.type}
						</span>
					</button>
				))}
			</div>
		</div>
	);
}

// ─── Issue List ───────────────────────────────────────────────────────────────

interface IssueResult {
	number: number;
	title: string;
	state: string;
	user: string | null;
	labels: (string | undefined)[];
	created_at: string;
	comments: number;
}

export function IssueListResults({
	output,
	onNavigateIssue,
}: {
	output: { issues?: IssueResult[] };
	onNavigateIssue?: (number: number) => void;
}) {
	const issues = output.issues;
	if (!issues?.length) {
		return (
			<div className="text-xs text-muted-foreground/60 py-2 font-mono">
				No issues found
			</div>
		);
	}

	return (
		<div className="border border-border/40 dark:border-white/6 rounded-md overflow-hidden my-2">
			<div className="divide-y divide-border/30 dark:divide-white/4">
				{issues.map((issue) => (
					<button
						key={issue.number}
						type="button"
						onClick={() => onNavigateIssue?.(issue.number)}
						className="w-full text-left px-3 py-2 hover:bg-muted/30 dark:hover:bg-white/3 transition-colors cursor-pointer"
					>
						<div className="flex items-center gap-2">
							<span
								className={cn(
									"size-2 rounded-full shrink-0",
									issue.state === "open"
										? "bg-success"
										: "bg-alert-important",
								)}
							/>
							<span className="text-sm text-foreground truncate flex-1">
								{issue.title}
							</span>
							<span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">
								#{issue.number}
							</span>
						</div>
						<div className="flex items-center gap-2 mt-0.5 pl-4">
							{issue.user && (
								<span className="text-[10px] text-muted-foreground/60 font-mono">
									{issue.user}
								</span>
							)}
							<span className="text-[10px] text-muted-foreground/60 font-mono">
								<TimeAgo date={issue.created_at} />
							</span>
							{issue.comments > 0 && (
								<span className="text-[10px] text-muted-foreground/60 font-mono">
									{issue.comments} comments
								</span>
							)}
						</div>
					</button>
				))}
			</div>
		</div>
	);
}

// ─── PR List ──────────────────────────────────────────────────────────────────

interface PRResult {
	number: number;
	title: string;
	state: string;
	user: string | null;
	created_at: string;
	draft: boolean;
	head: string;
	base: string;
}

export function PRListResults({ output }: { output: { pull_requests?: PRResult[] } }) {
	const prs = output.pull_requests;
	if (!prs?.length) {
		return (
			<div className="text-xs text-muted-foreground/60 py-2 font-mono">
				No pull requests found
			</div>
		);
	}

	return (
		<div className="border border-border/40 dark:border-white/6 rounded-md overflow-hidden my-2">
			<div className="divide-y divide-border/30 dark:divide-white/4">
				{prs.map((pr) => (
					<div key={pr.number} className="px-3 py-2">
						<div className="flex items-center gap-2">
							<span
								className={cn(
									"size-2 rounded-full shrink-0",
									pr.draft
										? "bg-muted-foreground/50"
										: pr.state ===
											  "open"
											? "bg-success"
											: "bg-alert-important",
								)}
							/>
							<span className="text-sm text-foreground truncate flex-1">
								{pr.title}
							</span>
							<span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">
								#{pr.number}
							</span>
						</div>
						<div className="flex items-center gap-2 mt-0.5 pl-4">
							<span className="text-[10px] text-muted-foreground/60 font-mono">
								{pr.head} → {pr.base}
							</span>
							{pr.draft && (
								<span className="text-[9px] text-muted-foreground/60 font-mono border border-border/40 px-1 rounded">
									Draft
								</span>
							)}
							<span className="text-[10px] text-muted-foreground/60 font-mono">
								<TimeAgo date={pr.created_at} />
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ─── Notification List ────────────────────────────────────────────────────────

interface NotificationResult {
	id: string;
	reason: string;
	subject_title: string;
	subject_type: string;
	repo: string;
	updated_at: string;
	unread: boolean;
}

export function NotificationListResults({
	output,
}: {
	output: { notifications?: NotificationResult[] };
}) {
	const notifs = output.notifications;
	if (!notifs?.length) {
		return (
			<div className="text-xs text-muted-foreground/60 py-2 font-mono">
				No notifications
			</div>
		);
	}

	return (
		<div className="border border-border/40 dark:border-white/6 rounded-md overflow-hidden my-2">
			<div className="divide-y divide-border/30 dark:divide-white/4">
				{notifs.map((n) => (
					<div key={n.id} className="px-3 py-2">
						<div className="flex items-center gap-2">
							{n.unread && (
								<span className="size-1.5 rounded-full bg-info shrink-0" />
							)}
							<span className="text-sm text-foreground truncate flex-1">
								{n.subject_title}
							</span>
							<span className="text-[10px] text-muted-foreground/60 font-mono shrink-0">
								{n.subject_type}
							</span>
						</div>
						<div className="flex items-center gap-2 mt-0.5 pl-3.5">
							<span className="text-[10px] text-muted-foreground/60 font-mono">
								{n.repo}
							</span>
							<span className="text-[10px] text-muted-foreground/60 font-mono">
								<TimeAgo date={n.updated_at} />
							</span>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

// ─── User Profile Card ────────────────────────────────────────────────────────

interface UserProfile {
	login: string;
	name: string | null;
	bio: string | null;
	avatar_url: string;
	html_url: string;
	public_repos: number;
	followers: number;
	following: number;
	company: string | null;
	location: string | null;
	blog: string | null;
	created_at: string;
}

export function UserProfileCard({
	output,
	onOpenUrl,
}: {
	output: UserProfile;
	onOpenUrl?: (url: string) => void;
}) {
	return (
		<div className="border border-border/40 dark:border-white/6 rounded-md overflow-hidden my-2">
			<div className="px-3 py-3 flex items-start gap-3">
				<img
					src={output.avatar_url}
					alt={output.login}
					className="size-10 rounded-full shrink-0"
				/>
				<div className="flex-1 min-w-0">
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium text-foreground">
							{output.name || output.login}
						</span>
						<span className="text-xs text-muted-foreground/60 font-mono">
							@{output.login}
						</span>
					</div>
					{output.bio && (
						<p className="text-[11px] text-muted-foreground/60 mt-0.5">
							{output.bio}
						</p>
					)}
					<div className="flex items-center gap-3 mt-1.5">
						<span className="text-[10px] text-muted-foreground/60 font-mono">
							{output.public_repos} repos
						</span>
						<span className="text-[10px] text-muted-foreground/60 font-mono">
							{formatNumber(output.followers)} followers
						</span>
						<span className="text-[10px] text-muted-foreground/60 font-mono">
							{output.following} following
						</span>
					</div>
					{(output.company || output.location) && (
						<div className="flex items-center gap-2 mt-1">
							{output.company && (
								<span className="text-[10px] text-muted-foreground/60 font-mono">
									{output.company}
								</span>
							)}
							{output.location && (
								<span className="text-[10px] text-muted-foreground/60 font-mono">
									{output.location}
								</span>
							)}
						</div>
					)}
				</div>
				<button
					type="button"
					onClick={() => onOpenUrl?.(output.html_url)}
					className="shrink-0 p-1 text-muted-foreground/60 hover:text-foreground transition-colors"
				>
					<ExternalLink className="size-3.5" />
				</button>
			</div>
		</div>
	);
}

// ─── Action Result (star, fork, follow, etc.) ─────────────────────────────────

export function ActionResult({
	output,
}: {
	output: {
		success?: boolean;
		action?: string;
		repo?: string;
		full_name?: string;
		username?: string;
		number?: number;
		title?: string;
		html_url?: string;
		message?: string;
	};
}) {
	const success = output.success !== false;
	const label = output.action || output.message || (success ? "Done" : "Failed");

	return (
		<div
			className={cn(
				"flex items-center gap-2 py-1.5 px-2.5 rounded-md text-xs my-1",
				success
					? "bg-success/10 text-success"
					: "bg-destructive/10 text-destructive",
			)}
		>
			{success ? (
				<Check className="size-3 shrink-0" />
			) : (
				<X className="size-3 shrink-0" />
			)}
			<span className="font-mono capitalize">{label}</span>
			{(output.repo || output.full_name || output.username) && (
				<span className="text-muted-foreground/60 font-mono">
					{output.repo || output.full_name || `@${output.username}`}
				</span>
			)}
			{output.html_url && (
				<a
					href={output.html_url}
					target="_blank"
					rel="noopener noreferrer"
					className="ml-auto text-muted-foreground/60 hover:text-foreground transition-colors"
				>
					<ExternalLink className="size-3" />
				</a>
			)}
		</div>
	);
}

// ─── Repo Info Card ───────────────────────────────────────────────────────────

export function RepoInfoCard({
	output,
	onNavigate,
}: {
	output: {
		full_name: string;
		description: string | null;
		stargazers_count: number;
		forks_count: number;
		open_issues_count: number;
		language: string | null;
		default_branch: string;
		created_at: string;
		updated_at: string;
		license: string | null;
		topics: string[];
		private: boolean;
		fork: boolean;
		archived: boolean;
		watchers_count: number;
		owner_avatar: string | null;
	};
	onNavigate?: (fullName: string) => void;
}) {
	return (
		<div className="border border-border/40 dark:border-white/6 rounded-md overflow-hidden my-2">
			<div className="px-3 py-3">
				<div className="flex items-center gap-2 mb-1">
					{output.owner_avatar && (
						<img
							src={output.owner_avatar}
							alt=""
							className="size-5 rounded-full shrink-0"
						/>
					)}
					<button
						type="button"
						onClick={() => onNavigate?.(output.full_name)}
						className="text-sm font-mono text-foreground hover:underline cursor-pointer"
					>
						{output.full_name}
					</button>
					{output.private && (
						<span className="text-[9px] font-mono px-1 py-0.5 border border-border/40 text-muted-foreground/60">
							Private
						</span>
					)}
					{output.archived && (
						<span className="text-[9px] font-mono px-1 py-0.5 border border-warning/30 text-warning">
							Archived
						</span>
					)}
				</div>
				{output.description && (
					<p className="text-[11px] text-muted-foreground/60 mb-2">
						{output.description}
					</p>
				)}
				<div className="flex items-center gap-3 text-[10px] text-muted-foreground/60 font-mono">
					{output.language && (
						<span className="flex items-center gap-1">
							<span
								className="size-1.5 rounded-full"
								style={{
									backgroundColor:
										getLanguageColor(
											output.language,
										),
								}}
							/>
							{output.language}
						</span>
					)}
					<span className="flex items-center gap-0.5">
						<Star className="size-2.5" />
						{formatNumber(output.stargazers_count)}
					</span>
					<span className="flex items-center gap-0.5">
						<GitFork className="size-2.5" />
						{formatNumber(output.forks_count)}
					</span>
					<span>{output.open_issues_count} issues</span>
					{output.license && <span>{output.license}</span>}
				</div>
				{output.topics && output.topics.length > 0 && (
					<div className="flex items-center gap-1 flex-wrap mt-2">
						{output.topics.slice(0, 8).map((topic) => (
							<span
								key={topic}
								className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-muted/50 dark:bg-white/4 text-muted-foreground/60"
							>
								{topic}
							</span>
						))}
					</div>
				)}
			</div>
		</div>
	);
}

// ─── AI Markdown ──────────────────────────────────────────────────────────────

export function AIMarkdown({ children }: { children: string }) {
	return (
		<div className="text-sm text-foreground/80 leading-relaxed [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_code]:text-xs [&_code]:font-mono [&_code]:bg-muted/50 [&_code]:dark:bg-white/5 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-2 [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:mb-1.5 [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:mb-1.5 [&_li]:text-sm [&_pre]:bg-muted/50 [&_pre]:dark:bg-white/4 [&_pre]:rounded-md [&_pre]:p-2 [&_pre]:my-1.5 [&_pre]:overflow-x-auto [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_strong]:font-medium">
			<ReactMarkdown>{children}</ReactMarkdown>
		</div>
	);
}

// ─── Main AICommandResults component ──────────────────────────────────────────

export type AIMessage = {
	id: string;
	role: "user" | "assistant" | "system";
	parts: Array<{
		type: string;
		text?: string;
		toolName?: string;
		toolCallId?: string;
		state?: string;
		args?: Record<string, unknown>;
		output?: unknown;
		input?: unknown;
	}>;
};

const SUGGESTIONS = [
	"Star this repo",
	"Search repos about AI",
	"Show my notifications",
	"Create an issue",
	"Find TypeScript repos",
	"Fork this repo",
	"Go to my PRs",
	"Who is torvalds?",
];

export function AICommandResults({
	messages,
	isStreaming,
	error,
	onQuickReply,
	onNavigateRepo,
	onOpenUrl,
	onClear,
}: {
	messages: AIMessage[];
	isStreaming: boolean;
	error: Error | undefined;
	onQuickReply: (text: string) => void;
	onNavigateRepo: (fullName: string) => void;
	onOpenUrl: (url: string) => void;
	onClear: () => void;
}) {
	const { data: session } = useSession();

	if (messages.length === 0 && !isStreaming) {
		return (
			<div className="py-10 px-6">
				<div className="flex items-center justify-center gap-2 mb-1">
					<svg
						className="size-4 text-muted-foreground/60"
						xmlns="http://www.w3.org/2000/svg"
						width="1em"
						height="1em"
						viewBox="0 0 24 24"
					>
						<path
							fill="none"
							stroke="currentColor"
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth="2"
							d="M16 18a2 2 0 0 1 2 2a2 2 0 0 1 2-2a2 2 0 0 1-2-2a2 2 0 0 1-2 2m0-12a2 2 0 0 1 2 2a2 2 0 0 1 2-2a2 2 0 0 1-2-2a2 2 0 0 1-2 2M9 18a6 6 0 0 1 6-6a6 6 0 0 1-6-6a6 6 0 0 1-6 6a6 6 0 0 1 6 6"
						/>
					</svg>
				</div>
				<p className="text-sm text-muted-foreground/70 mb-2 text-center">
					Ask me anything about GitHub
				</p>
				<div className="flex justify-center mb-5">
					<span className="rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-medium text-warning">
						Experimental
					</span>
				</div>
				<div className="flex flex-wrap items-center justify-center gap-1.5">
					{SUGGESTIONS.map((s) => (
						<button
							key={s}
							type="button"
							onClick={() => onQuickReply(s)}
							className="text-[11px] px-2.5 py-1 rounded-full border border-border/50 dark:border-white/7 text-muted-foreground/60 hover:text-foreground hover:border-foreground/20 hover:bg-muted/30 dark:hover:bg-white/3 transition-all duration-150"
						>
							{s}
						</button>
					))}
				</div>
			</div>
		);
	}

	// Group messages into turns
	const turns: {
		userMessage: AIMessage | null;
		assistantMessages: AIMessage[];
	}[] = [];
	let current: (typeof turns)[number] | null = null;

	for (const message of messages) {
		if (message.role === "user") {
			if (current) turns.push(current);
			current = { userMessage: message, assistantMessages: [] };
		} else if (message.role === "assistant") {
			if (!current) {
				current = { userMessage: null, assistantMessages: [message] };
			} else {
				current.assistantMessages.push(message);
			}
		}
	}
	if (current) turns.push(current);

	return (
		<div className="px-4 py-3 space-y-3">
			{messages.length > 0 && !isStreaming && (
				<div className="flex justify-end">
					<button
						type="button"
						onClick={onClear}
						className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-muted-foreground transition-colors duration-150"
					>
						New chat
					</button>
				</div>
			)}
			{turns.map((turn, turnIndex) => (
				<div
					key={turnIndex}
					className="rounded-lg bg-muted/20 dark:bg-white/[0.02] px-3 py-2.5"
				>
					{/* User message */}
					{turn.userMessage && (
						<div className="flex items-center gap-2.5 mb-2">
							{session?.user?.image ? (
								<img
									src={session.user.image}
									alt={
										session.user.name ||
										""
									}
									className="size-7 rounded-full shrink-0"
								/>
							) : (
								<div className="size-7 rounded-full bg-foreground/10 shrink-0" />
							)}
							<span className="text-[12px] font-semibold text-foreground/80 shrink-0">
								{session?.user?.name || "You"}
							</span>
							<span className="text-sm text-foreground/50 truncate ml-auto min-w-0">
								{turn.userMessage.parts
									.filter(
										(p) =>
											p.type ===
											"text",
									)
									.map((p) => p.text)
									.join("")}
							</span>
						</div>
					)}

					{/* Assistant messages */}
					{turn.assistantMessages.map((message) => (
						<div key={message.id} className="space-y-1">
							{message.parts.map((part, index) => {
								if (
									part.type === "text" &&
									part.text
								) {
									return (
										<AIMarkdown
											key={index}
										>
											{part.text}
										</AIMarkdown>
									);
								}

								if (part.type.startsWith("tool-")) {
									const toolName =
										part.type.replace(
											"tool-",
											"",
										);
									const state = part.state;
									const output =
										part.output as Record<
											string,
											unknown
										>;

									if (
										state ===
											"input-available" ||
										state ===
											"input-streaming"
									) {
										return (
											<ToolLoading
												key={
													index
												}
												toolName={
													toolName
												}
											/>
										);
									}

									if (
										state ===
										"output-error"
									) {
										return (
											<div
												key={
													index
												}
												className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs my-1"
											>
												<AlertTriangle className="size-3" />
												<span className="font-mono">
													Error:{" "}
													{
														toolName
													}
												</span>
											</div>
										);
									}

									if (
										state ===
											"output-available" &&
										output
									) {
										// Route to the right component
										if (
											toolName ===
											"searchRepos"
										) {
											return (
												<RepoSearchResults
													key={
														index
													}
													output={
														output as ComponentProps<
															typeof RepoSearchResults
														>["output"]
													}
													onNavigate={
														onNavigateRepo
													}
												/>
											);
										}
										if (
											toolName ===
											"searchUsers"
										) {
											return (
												<UserSearchResults
													key={
														index
													}
													output={
														output as ComponentProps<
															typeof UserSearchResults
														>["output"]
													}
													onOpenUrl={
														onOpenUrl
													}
												/>
											);
										}
										if (
											toolName ===
											"getRepoInfo"
										) {
											return (
												<RepoInfoCard
													key={
														index
													}
													output={
														output as ComponentProps<
															typeof RepoInfoCard
														>["output"]
													}
													onNavigate={
														onNavigateRepo
													}
												/>
											);
										}
										if (
											toolName ===
											"getUserProfile"
										) {
											return (
												<UserProfileCard
													key={
														index
													}
													output={
														output as unknown as ComponentProps<
															typeof UserProfileCard
														>["output"]
													}
													onOpenUrl={
														onOpenUrl
													}
												/>
											);
										}
										if (
											toolName ===
											"listIssues"
										) {
											return (
												<IssueListResults
													key={
														index
													}
													output={
														output as ComponentProps<
															typeof IssueListResults
														>["output"]
													}
												/>
											);
										}
										if (
											toolName ===
											"listPullRequests"
										) {
											return (
												<PRListResults
													key={
														index
													}
													output={
														output as ComponentProps<
															typeof PRListResults
														>["output"]
													}
												/>
											);
										}
										if (
											toolName ===
											"listNotifications"
										) {
											return (
												<NotificationListResults
													key={
														index
													}
													output={
														output as ComponentProps<
															typeof NotificationListResults
														>["output"]
													}
												/>
											);
										}
										// Client actions render nothing (handled by parent)
										if (
											output._clientAction
										) {
											return null;
										}
										// Default: action result
										return (
											<ActionResult
												key={
													index
												}
												output={
													output as ComponentProps<
														typeof ActionResult
													>["output"]
												}
											/>
										);
									}
								}

								return null;
							})}
						</div>
					))}
				</div>
			))}

			{/* Streaming indicator */}
			{isStreaming &&
				!messages.some(
					(m) =>
						m.role === "assistant" &&
						m.parts.some(
							(p) =>
								p.state === "input-available" ||
								p.state === "input-streaming",
						),
				) && (
					<div className="flex items-center gap-2 py-1 text-xs text-muted-foreground/60">
						<Loader2 className="size-3 animate-spin" />
						<span className="font-mono">Thinking...</span>
					</div>
				)}

			{/* Error display */}
			{error && (
				<div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-destructive/10 text-destructive text-xs">
					<AlertTriangle className="size-3" />
					<span>{error.message}</span>
				</div>
			)}
		</div>
	);
}
