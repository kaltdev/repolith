import {
	BookOpen,
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
	lines: string[];
}

const RECOMMENDED_FILES = [
	{ name: "README", icon: BookOpen },
	{ name: "LICENSE", icon: Scale },
	{ name: ".gitignore", icon: FileCode2 },
];

function CommandSection({ title, description, lines }: CommandSectionProps) {
	return (
		<section className="rounded-md border border-border/60 bg-card/30">
			<div className="border-b border-border/40 px-4 py-3">
				<h3 className="text-sm font-medium text-foreground">{title}</h3>
				<p className="mt-1 text-xs text-muted-foreground/80">
					{description}
				</p>
			</div>
			<pre className="overflow-x-auto px-4 py-3 text-[11px] leading-6">
				<code className="font-mono text-muted-foreground">
					{lines.join("\n")}
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

	const newRepoCommands = [
		"git init",
		"# add the files you want to publish",
		"git add .",
		'git commit -m "Initial commit"',
		`git branch -M ${branch}`,
		`git remote add origin ${httpsCloneUrl}`,
		`git push -u origin ${branch}`,
	];

	const existingRepoCommands = [
		`git remote add origin ${httpsCloneUrl}`,
		`git branch -M ${branch}`,
		`git push -u origin ${branch}`,
	];

	return (
		<div className={cn("flex flex-col gap-4 pb-4", className)}>
			<section className="rounded-md border border-border bg-card/40">
				<div className="flex flex-col gap-3 border-b border-border/50 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
					<div>
						<div className="flex items-center gap-2">
							<Terminal className="size-4 text-muted-foreground" />
							<h2 className="text-sm font-medium text-foreground">
								Quick Setup
							</h2>
						</div>
						<p className="mt-1 text-xs text-muted-foreground/80">
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
						className="inline-flex items-center gap-1.5 self-start rounded-md border border-border px-3 py-1.5 text-[11px] font-mono text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground sm:self-auto"
					>
						<ExternalLink className="size-3" />
						View on GitHub
					</a>
				</div>

				<div className="grid gap-3 p-4 md:grid-cols-2">
					<div className="rounded-md border border-border/60 bg-background/50 p-3">
						<div className="mb-2 flex items-center gap-1.5">
							<GitBranch className="size-3 text-muted-foreground/70" />
							<span className="text-[10px] font-mono uppercase text-muted-foreground/70">
								HTTPS
							</span>
						</div>
						<code className="block break-all text-xs font-mono text-foreground">
							{httpsCloneUrl}
						</code>
					</div>
					<div className="rounded-md border border-border/60 bg-background/50 p-3">
						<div className="mb-2 flex items-center gap-1.5">
							<GitBranch className="size-3 text-muted-foreground/70" />
							<span className="text-[10px] font-mono uppercase text-muted-foreground/70">
								SSH
							</span>
						</div>
						<code className="block break-all text-xs font-mono text-foreground">
							{sshCloneUrl}
						</code>
					</div>
				</div>
			</section>

			<div className="grid gap-4 xl:grid-cols-2">
				<CommandSection
					title="Create a new repository from the command line"
					description="Start locally, choose the files you want, then push the first commit."
					lines={newRepoCommands}
				/>
				<CommandSection
					title="Push an existing repository"
					description="Connect an existing local repository to this remote."
					lines={existingRepoCommands}
				/>
			</div>

			<section className="rounded-md border border-border/60 p-4">
				<div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
					<div>
						<h3 className="text-sm font-medium text-foreground">
							Optional next steps
						</h3>
						<p className="mt-1 max-w-2xl text-xs text-muted-foreground/80">
							Add only the files this project needs.
							Common starting points are recommended here,
							but nothing is generated automatically.
						</p>
						<div className="mt-3 flex flex-wrap gap-2">
							{RECOMMENDED_FILES.map(
								({ name, icon: Icon }) => (
									<span
										key={name}
										className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-2.5 py-1 text-[11px] font-mono text-muted-foreground"
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
								className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[11px] font-mono text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
							>
								<FilePlus2 className="size-3" />
								Create a new file
							</a>
							<a
								href={`${githubRepoUrl}/upload/${encodedBranch}`}
								data-no-github-intercept
								target="_blank"
								rel="noopener noreferrer"
								className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[11px] font-mono text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
							>
								<Upload className="size-3" />
								Upload existing files
							</a>
						</div>
					) : (
						<p className="max-w-sm text-xs text-muted-foreground/70 lg:text-right">
							You can clone this repository. Pushing files
							or initializing it requires write access.
						</p>
					)}
				</div>
			</section>

			<p className="text-[11px] font-mono text-muted-foreground/60">
				Using SSH instead? Replace the HTTPS remote URL in the commands with{" "}
				{sshCloneUrl}.
			</p>
		</div>
	);
}
