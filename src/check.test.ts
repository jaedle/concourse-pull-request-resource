import { beforeEach, describe, expect, it } from "vitest";
import { check } from "./check.js";
import type { PullRequestFetcher } from "./github-client.js";
import type { PullRequestCommit } from "./types.js";

class FakePullRequestFetcher implements PullRequestFetcher {
  private commits: PullRequestCommit[] = [];
  capturedOwner: string | null = null;
  capturedRepo: string | null = null;

  setCommits(commits: PullRequestCommit[]): void {
    this.commits = commits;
  }

  async fetchPullRequestCommits(
    owner: string,
    repo: string,
  ): Promise<PullRequestCommit[]> {
    this.capturedOwner = owner;
    this.capturedRepo = repo;
    return this.commits;
  }
}

const sampleCommits: PullRequestCommit[] = [
  { pr: 1, commit: "aaa", committed: "2024-01-01T10:00:00Z" },
  { pr: 2, commit: "bbb", committed: "2024-01-02T10:00:00Z" },
  { pr: 1, commit: "ccc", committed: "2024-01-03T10:00:00Z" },
];

const source = { repository: "owner/repo", access_token: "token" };

describe("check", () => {
  let fake: FakePullRequestFetcher;

  beforeEach(() => {
    fake = new FakePullRequestFetcher();
    fake.setCommits(sampleCommits);
  });

  it("returns only the latest version when no version is given", async () => {
    const result = await check({ source }, fake);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      pr: "1",
      commit: "ccc",
      committed: "2024-01-03T10:00:00Z",
    });
  });

  it("returns empty array when no version given and no commits exist", async () => {
    fake.setCommits([]);
    const result = await check({ source }, fake);
    expect(result).toEqual([]);
  });

  it("returns all commits after the given version committed date", async () => {
    const result = await check(
      {
        source,
        version: { pr: "1", commit: "aaa", committed: "2024-01-01T10:00:00Z" },
      },
      fake,
    );

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      pr: "2",
      commit: "bbb",
      committed: "2024-01-02T10:00:00Z",
    });
    expect(result[1]).toEqual({
      pr: "1",
      commit: "ccc",
      committed: "2024-01-03T10:00:00Z",
    });
  });

  it("returns empty array when no commits are newer than the given version", async () => {
    const result = await check(
      {
        source,
        version: { pr: "1", commit: "ccc", committed: "2024-01-03T10:00:00Z" },
      },
      fake,
    );

    expect(result).toEqual([]);
  });

  it("sorts commits by committed date when returning new versions", async () => {
    fake.setCommits([
      { pr: 1, commit: "zzz", committed: "2024-01-05T00:00:00Z" },
      { pr: 2, commit: "yyy", committed: "2024-01-04T00:00:00Z" },
    ]);

    const result = await check(
      {
        source,
        version: { pr: "1", commit: "aaa", committed: "2024-01-01T00:00:00Z" },
      },
      fake,
    );

    expect(result[0].commit).toBe("yyy");
    expect(result[1].commit).toBe("zzz");
  });

  it("passes correct owner and repo to the fetcher", async () => {
    await check(
      { source: { repository: "myorg/myrepo", access_token: "mytoken" } },
      fake,
    );

    expect(fake.capturedOwner).toBe("myorg");
    expect(fake.capturedRepo).toBe("myrepo");
  });
});
