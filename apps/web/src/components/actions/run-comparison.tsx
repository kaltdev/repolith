export interface ComparisonRun {
	run: {
		id: number;
		run_number: number;
		status: string | null;
		conclusion: string | null;
		head_branch: string | null;
		head_sha: string;
		event: string;
		run_started_at?: string | null;
		updated_at: string;
		actor: { login: string; avatar_url: string } | null;
	};
	jobs: {
		id: number;
		name: string;
		status: string;
		conclusion: string | null;
		started_at: string | null;
		completed_at: string | null;
		steps?: {
			name: string;
			status: string;
			conclusion: string | null;
			started_at: string | null;
			completed_at: string | null;
		}[];
	}[];
}
