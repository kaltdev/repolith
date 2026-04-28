"use client";

import { useState } from "react";
import {
	BookOpen,
	Check,
	Copy,
	ExternalLink,
	FileCode2,
	FilePlus2,
	GitBranch,
	Scale,
	Terminal,
	Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyRepoQuickSetupProps {
	owner: string;
	repo: string;
	defaultBranch?: string | null;
	canWrite?: boolean;
	className?: string;
}

interface CommandSectionProps {
	title: string;
	description: string;
	value: string;
}

const RECOMMENDED_FILES = [
	{ name: "README", icon: BookOpen },
	{ name: "LICENSE", icon: Scale },
	{ name: ".gitignore", icon: FileCode2 },
];

const NEW_REPO_COMMANDS = `git init
# add the files you want to publish
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/radityprtama/hello.git
git push -u origin main`;

function CopyButton({
	value,
	label,
	iconOnly = false,
	className,
}: {
	value: string;
	label: string;
	iconOnly?: boolean;
	className?: string;
}) {
	const [copied, setCopied] = useState(false);

	function handleCopy() {
		navigator.clipboard.writeText(value);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	}

	return (
		<button
			type="button"
			onClick={handleCopy}
			className={cn(
				iconOnly
					? "inline-flex shrink-0 cursor-pointer items-center justify-center border-l border-border px-2.5 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground dark:hover:bg-white/[0.04]"
					: "inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 border border-border px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground dark:hover:bg-white/[0.04]",
				className,
			)}
			aria-label={label}
			title={label}
		>
			{copied ? (
				<Check className="size-3 text-success" />
			) : (
				<Copy className="size-3" />
			)}
			{!iconOnly && <span>{copied ? "Copied" : "Copy"}</span>}
		</button>
	);
}

function CloneUrlField({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<div className="mb-1.5 flex items-center gap-1.5">
				<GitBranch className="size-3 text-muted-foreground/70" />
				<span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70">
					{label}
				</span>
			</div>
			<div className="flex min-w-0 items-stretch overflow-hidden border border-border">
				<input
					readOnly
					type="text"
					value={value}
					aria-label={`${label} clone URL`}
					className="min-w-0 flex-1 bg-transparent px-3 py-1.5 text-xs font-mono text-foreground outline-none focus:bg-muted/20"
					onFocus={(event) => event.currentTarget.select()}
				/>
				<CopyButton
					value={value}
					label={`Copy ${label} clone URL`}
					iconOnly
				/>
			</div>
		</div>
	);
}

function CommandSection({ title, description, value }: CommandSectionProps) {
	return (
		<section className="px-4 py-4">
			<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
						{title}
					</label>
					<p className="mt-1 text-[10px] font-mono text-muted-foreground/60">
						{description}
					</p>
				</div>
				<CopyButton
					value={value}
					label={`Copy commands for ${title}`}
					className="self-start"
				/>
			</div>
			<div
				className="mt-3 overflow-hidden border border-border"
				style={{ backgroundColor: "var(--code-bg)" }}
			>
				<pre
					className="overflow-x-auto p-3 text-[13px] leading-5"
					style={{
						fontFamily: "var(--font-code), ui-monospace, monospace",
					}}
				>
					<code className="whitespace-pre text-foreground">
						{value}
					</code>
				</pre>
			</div>
		</section>
	);
}

export function EmptyRepoQuickSetup({
	owner,
	repo,
	defaultBranch,
	canWrite = false,
	className,
}: EmptyRepoQuickSetupProps) {
	const branch = defaultBranch || "main";
	const httpsCloneUrl = `https://github.com/${owner}/${repo}.git`;
	const sshCloneUrl = `git@github.com:${owner}/${repo}.git`;
	const githubRepoUrl = `https://github.com/${owner}/${repo}`;
	const encodedBranch = encodeURIComponent(branch);

	const existingRepoCommands = [
		`git remote add origin ${httpsCloneUrl}`,
		`git branch -M ${branch}`,
		`git push -u origin ${branch}`,
	].join("\n");

	return (
		<div className={cn("pb-4", className)}>
			<section className="border border-border bg-card">
				<div className="divide-y divide-border">
					<div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
						<div className="min-w-0">
							<div className="flex items-center gap-2">
								<Terminal className="size-3 text-muted-foreground" />
								<label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
									Quick Setup
								</label>
							</div>
							<p className="mt-1 max-w-2xl text-[10px] font-mono text-muted-foreground/60">
								This repository is empty. No README,
								license, or other starter files have
								been created.
							</p>
						</div>
						<a
							href={githubRepoUrl}
							data-no-github-intercept
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex shrink-0 items-center gap-1.5 self-start border border-border px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground dark:hover:bg-white/[0.04] sm:self-auto"
						>
							<ExternalLink className="size-3" />
							View on GitHub
						</a>
					</div>

					<div className="grid gap-3 px-4 py-4 md:grid-cols-2">
						<CloneUrlField
							label="HTTPS"
							value={httpsCloneUrl}
						/>
						<CloneUrlField label="SSH" value={sshCloneUrl} />
					</div>

					<div className="grid divide-y divide-border xl:grid-cols-2 xl:divide-x xl:divide-y-0">
						<CommandSection
							title="Create a new repository from the command line"
							description="Start locally, choose the files you want, then push the first commit."
							value={NEW_REPO_COMMANDS}
						/>
						<CommandSection
							title="Push an existing repository"
							description="Connect an existing local repository to this remote."
							value={existingRepoCommands}
						/>
					</div>

					<div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start lg:justify-between">
						<div className="min-w-0">
							<label className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
								Optional next steps
							</label>
							<p className="mt-1 max-w-2xl text-[10px] font-mono text-muted-foreground/60">
								Add only the files this project
								needs. Common starting points are
								recommended here, but nothing is
								generated automatically.
							</p>
							<div className="mt-3 flex flex-wrap gap-1.5">
								{RECOMMENDED_FILES.map(
									({ name, icon: Icon }) => (
										<span
											key={name}
											className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1.5 text-[10px] font-mono text-muted-foreground"
										>
											<Icon className="size-3" />
											{name}
										</span>
									),
								)}
							</div>
						</div>
						{canWrite ? (
							<div className="flex flex-wrap gap-2 lg:justify-end">
								<a
									href={`${githubRepoUrl}/new/${encodedBranch}`}
									data-no-github-intercept
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground dark:hover:bg-white/[0.04]"
								>
									<FilePlus2 className="size-3" />
									Create a new file
								</a>
								<a
									href={`${githubRepoUrl}/upload/${encodedBranch}`}
									data-no-github-intercept
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1.5 border border-border px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground dark:hover:bg-white/[0.04]"
								>
									<Upload className="size-3" />
									Upload existing files
								</a>
							</div>
						) : (
							<p className="max-w-sm text-[10px] font-mono text-muted-foreground/60 lg:text-right">
								You can clone this repository.
								Pushing files or initializing it
								requires write access.
							</p>
						)}
					</div>

					<p className="px-4 py-3 text-[10px] font-mono text-muted-foreground/60">
						Using SSH instead? Replace the HTTPS remote URL in
						the commands with {sshCloneUrl}.
					</p>
				</div>
			</section>
		</div>
	);
}
