import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSessionMock = vi.fn();
const getNotificationsMock = vi.fn();
const getTrendingReposMock = vi.fn();
const getUserEventsMock = vi.fn();
const getUserReposMock = vi.fn();
const searchIssuesMock = vi.fn();
const warmRepoPageDataBatchMock = vi.fn();
const waitUntilMock = vi.fn();

vi.mock("@/lib/auth", () => ({
	getServerSession: getServerSessionMock,
}));

vi.mock("@/lib/github", () => ({
	getNotifications: getNotificationsMock,
	getTrendingRepos: getTrendingReposMock,
	getUserEvents: getUserEventsMock,
	getUserRepos: getUserReposMock,
	searchIssues: searchIssuesMock,
	warmRepoPageDataBatch: warmRepoPageDataBatchMock,
}));

vi.mock("@/components/dashboard/dashboard-content", () => ({
	DashboardContent: vi.fn(() => null),
}));

vi.mock("@vercel/functions", () => ({
	waitUntil: waitUntilMock,
}));

vi.mock("better-all", () => ({
	all: async <T extends Record<string, () => Promise<unknown>>>(tasks: T) =>
		Object.fromEntries(
			await Promise.all(
				Object.entries(tasks).map(async ([key, task]) => [
					key,
					await task(),
				]),
			),
		),
}));

vi.mock("next/navigation", () => ({
	redirect: vi.fn((destination: string) => {
		throw new Error(`redirect:${destination}`);
	}),
}));

describe("DashboardPage", () => {
	beforeEach(() => {
		getServerSessionMock.mockReset();
		getNotificationsMock.mockReset();
		getTrendingReposMock.mockReset();
		getUserEventsMock.mockReset();
		getUserReposMock.mockReset();
		searchIssuesMock.mockReset();
		warmRepoPageDataBatchMock.mockReset();
		waitUntilMock.mockReset();
	});

	it("skips login-dependent GitHub queries when the hydrated GitHub login is missing", async () => {
		getServerSessionMock.mockResolvedValue({
			user: {
				id: "user-1",
				name: "Test User",
				image: "https://example.com/avatar.png",
			},
			session: {},
			githubUser: {
				accessToken: "token",
			},
		});
		getUserReposMock.mockResolvedValue([{ full_name: "owner/repo" }]);
		getNotificationsMock.mockResolvedValue([]);
		getTrendingReposMock.mockResolvedValue([]);
		warmRepoPageDataBatchMock.mockResolvedValue(undefined);

		const { default: DashboardPage } = await import("./page");
		const element = await DashboardPage();

		expect(searchIssuesMock).not.toHaveBeenCalled();
		expect(getUserEventsMock).not.toHaveBeenCalled();
		expect(getUserReposMock).toHaveBeenCalledWith("updated", 30);
		expect(getNotificationsMock).toHaveBeenCalledWith(20);
		expect(getTrendingReposMock).toHaveBeenCalledWith(undefined, "weekly", 8);
		expect(element.props.user).toEqual({
			login: "",
			avatar_url: "https://example.com/avatar.png",
			name: "Test User",
			public_repos: 0,
			followers: 0,
			following: 0,
		});
		expect(element.props.reviewRequests).toEqual({
			items: [],
			total_count: 0,
			incomplete_results: false,
		});
		expect(element.props.myOpenPRs).toEqual({
			items: [],
			total_count: 0,
			incomplete_results: false,
		});
		expect(element.props.myIssues).toEqual({
			items: [],
			total_count: 0,
			incomplete_results: false,
		});
		expect(element.props.activity).toEqual([]);
		expect(waitUntilMock).toHaveBeenCalledTimes(1);
		expect(warmRepoPageDataBatchMock).toHaveBeenCalledWith(["owner/repo"]);
	});
});
