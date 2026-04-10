import { CheckInput, Version, PullRequestCommit } from './types.js';
import { PullRequestFetcher, parseRepository } from './github-client.js';

export async function check(input: CheckInput, client: PullRequestFetcher): Promise<Version[]> {
  const { owner, repo } = parseRepository(input.source.repository);
  const commits = await client.fetchPullRequestCommits(owner, repo);

  const sorted = commits.slice().sort(
    (a, b) => new Date(a.committed).getTime() - new Date(b.committed).getTime(),
  );

  if (sorted.length === 0) {
    return [];
  }

  if (!input.version) {
    const latest = sorted[sorted.length - 1];
    return [toVersion(latest)];
  }

  const after = input.version.committed;
  const newer = sorted.filter((c) => c.committed > after);

  return newer.map(toVersion);
}

function toVersion(c: PullRequestCommit): Version {
  return {
    pr: String(c.pr),
    commit: c.commit,
    committed: c.committed,
  };
}
