import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

export function useReadme(
	owner: string,
	repo: string,
	_branch: string,
	initialHtml: string | null,
) {
	const queryClient = useQueryClient();

	const query = useQuery({
		queryKey: ["readme", owner, repo],
		queryFn: () => initialHtml,
		initialData: initialHtml ?? undefined,
		staleTime: Infinity,
		gcTime: Infinity,
		enabled: false,
	});

	const setReadmeHtml = useCallback(
		(html: string) => {
			queryClient.setQueryData(["readme", owner, repo], html);
		},
		[queryClient, owner, repo],
	);

	return { ...query, setReadmeHtml };
}
