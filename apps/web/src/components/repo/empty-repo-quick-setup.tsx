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
	className,
}: {
	value: string;
	label: string;
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
				"inline-flex h-7 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[11px] font-medium text-muted-foreground shadow-xs transition-colors hover:bg-muted/60 hover:text-foreground",
				className,
			)}
			aria-label={label}
			title={label}
		>
			{copied ? (
				<Check className="size-3.5 text-success" />
			) : (
				<Copy className="size-3.5" />
			)}
			<span>{copied ? "Copied" : "Copy"}</span>
		</button>
	);
}

function CloneUrlField({ label, value }: { label: string; value: string }) {
	return (
		<div>
			<div className="mb-1.5 flex items-center gap-1.5">
				<GitBranch className="size-3 text-muted-foreground/70" />
				<span className="text-[10px] font-mono font-medium uppercase text-muted-foreground/70">
					{label}
				</span>
			</div>
			<div className="flex min-w-0 items-stretch overflow-hidden rounded-md border border-border bg-background shadow-xs">
				<input
					readOnly
					type="text"
					value={value}
					aria-label={`${label} clone URL`}
					className="min-w-0 flex-1 bg-background px-3 py-2 text-xs font-mono text-foreground outline-none"
					onFocus={(event) => event.currentTarget.select()}
				/>
				<div className="flex border-l border-border bg-muted/20">
					<CopyButton
						value={value}
						label={`Copy ${label} clone URL`}
						className="h-auto rounded-none border-0 bg-transparent px-3 shadow-none"
					/>
				</div>
			</div>
		</div>
	);
}

function CommandSection({ title, description, value }: CommandSectionProps) {
	return (
		<section className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
			<div className="flex flex-col gap-3 border-b border-border bg-muted/20 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<h3 className="text-sm font-semibold text-foreground">
						{title}
					</h3>
					<p className="mt-1 text-xs leading-5 text-muted-foreground">
						{description}
					</p>
				</div>
				<CopyButton
					value={value}
					label={`Copy commands for ${title}`}
					className="self-start"
				/>
			</div>
			<pre className="overflow-x-auto bg-background px-4 py-3 text-xs leading-5">
				<code className="whitespace-pre font-mono text-foreground">
					{value}
				</code>
			</pre>
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
		<div className={cn("flex flex-col gap-4 pb-4", className)}>
			<section className="overflow-hidden rounded-md border border-border bg-card shadow-xs">
				<div className="flex flex-col gap-3 border-b border-border bg-muted/20 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
					<div className="min-w-0">
						<div className="flex items-center gap-2">
							<Terminal className="size-4 text-muted-foreground" />
							<h2 className="text-sm font-semibold text-foreground">
								Quick Setup
							</h2>
						</div>
						<p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
							This repository is empty. No README,
							license, or other starter files have been
							created.
						</p>
					</div>
					<a
						href={githubRepoUrl}
						data-no-github-intercept
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex h-8 shrink-0 items-center gap-1.5 self-start rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground shadow-xs transition-colors hover:bg-muted/60 hover:text-foreground sm:self-auto"
					>
						<ExternalLink className="size-3" />
						View on GitHub
					</a>
				</div>

				<div className="grid gap-3 p-4 md:grid-cols-2">
					<CloneUrlField label="HTTPS" value={httpsCloneUrl} />
					<CloneUrlField label="SSH" value={sshCloneUrl} />
				</div>
			</section>

			<div className="grid gap-4 xl:grid-cols-2">
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

			<section className="rounded-md border border-border bg-card p-4 shadow-xs">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
					<div className="min-w-0">
						<h3 className="text-sm font-semibold text-foreground">
							Optional next steps
						</h3>
						<p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
							Add only the files this project needs.
							Common starting points are recommended here,
							but nothing is generated automatically.
						</p>
						<div className="mt-3 flex flex-wrap gap-2">
							{RECOMMENDED_FILES.map(
								({ name, icon: Icon }) => (
									<span
										key={name}
										className="inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 text-[11px] font-mono text-muted-foreground shadow-xs"
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
								className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground shadow-xs transition-colors hover:bg-muted/60 hover:text-foreground"
							>
								<FilePlus2 className="size-3" />
								Create a new file
							</a>
							<a
								href={`${githubRepoUrl}/upload/${encodedBranch}`}
								data-no-github-intercept
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium text-muted-foreground shadow-xs transition-colors hover:bg-muted/60 hover:text-foreground"
							>
								<Upload className="size-3" />
								Upload existing files
							</a>
						</div>
					) : (
						<p className="max-w-sm text-xs leading-5 text-muted-foreground lg:text-right">
							You can clone this repository. Pushing files
							or initializing it requires write access.
						</p>
					)}
				</div>
			</section>

			<p className="px-1 text-[11px] font-mono leading-5 text-muted-foreground/70">
				Using SSH instead? Replace the HTTPS remote URL in the commands with{" "}
				{sshCloneUrl}.
			</p>
		</div>
	);
}
