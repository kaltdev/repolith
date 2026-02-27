import { getLanguageFromFilename } from "@/lib/github-utils";
import { highlightCode } from "@/lib/shiki";
import { CodeViewerClient } from "./code-viewer-client";

export async function CodeViewer({
	content,
	filename,
	className,
	filePath,
	fileSize,
	hideHeader,
	canEdit,
	sha,
	owner,
	repo,
	branch,
}: {
	content: string;
	filename: string;
	className?: string;
	filePath?: string;
	fileSize?: number;
	hideHeader?: boolean;
	canEdit?: boolean;
	sha?: string;
	owner?: string;
	repo?: string;
	branch?: string;
}) {
	const lang = getLanguageFromFilename(filename);
	const html = await highlightCode(content, lang);

	const lineCount = content.split("\n").length;
	const gutterW = String(lineCount).length;

	return (
		<CodeViewerClient
			html={html}
			content={content}
			filename={filename}
			filePath={filePath}
			language={lang}
			lineCount={lineCount}
			fileSize={fileSize}
			gutterW={gutterW}
			className={className}
			hideHeader={hideHeader}
			canEdit={canEdit}
			sha={sha}
			owner={owner}
			repo={repo}
			branch={branch}
		/>
	);
}
