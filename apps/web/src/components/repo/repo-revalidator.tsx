"use client";

import { useEffect, useRef } from "react";
import {
	revalidateRepoPageData,
	revalidateRepoTree,
} from "@/app/(app)/repos/[owner]/[repo]/revalidate-actions";

interface RepoRevalidatorProps {
	owner: string;
	repo: string;
	defaultBranch: string;
}

export function RepoRevalidator({ owner, repo, defaultBranch }: RepoRevalidatorProps) {
	const didRun = useRef(false);

	useEffect(() => {
		if (didRun.current) return;
		didRun.current = true;

		revalidateRepoPageData(owner, repo).catch(() => {});
		revalidateRepoTree(owner, repo, defaultBranch).catch(() => {});
	}, [owner, repo, defaultBranch]);

	return null;
}
