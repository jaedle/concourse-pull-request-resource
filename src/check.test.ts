import { describe, it, expect, vi, beforeEach } from 'vitest';
import { check } from './check.js';
import * as githubClient from './github-client.js';
import { PullRequestCommit } from './types.js';

vi.mock('./github-client.js', async (importOriginal) => {
  const actual = await importOriginal<typeof githubClient>();
  return {
    ...actual,
    fetchPullRequestCommits: vi.fn(),
  };
});

const mockFetch = vi.mocked(githubClient.fetchPullRequestCommits);

const sampleCommits: PullRequestCommit[] = [
  { pr: 1, commit: 'aaa', committed: '2024-01-01T10:00:00Z' },
  { pr: 2, commit: 'bbb', committed: '2024-01-02T10:00:00Z' },
  { pr: 1, commit: 'ccc', committed: '2024-01-03T10:00:00Z' },
];

const source = { repository: 'owner/repo', access_token: 'token' };

describe('check', () => {
  beforeEach(() => {
    mockFetch.mockResolvedValue(sampleCommits);
  });

  it('returns only the latest version when no version is given', async () => {
    const result = await check({ source });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ pr: '1', commit: 'ccc', committed: '2024-01-03T10:00:00Z' });
  });

  it('returns empty array when no version given and no commits exist', async () => {
    mockFetch.mockResolvedValue([]);
    const result = await check({ source });
    expect(result).toEqual([]);
  });

  it('returns all commits after the given version committed date', async () => {
    const result = await check({
      source,
      version: { pr: '1', commit: 'aaa', committed: '2024-01-01T10:00:00Z' },
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ pr: '2', commit: 'bbb', committed: '2024-01-02T10:00:00Z' });
    expect(result[1]).toEqual({ pr: '1', commit: 'ccc', committed: '2024-01-03T10:00:00Z' });
  });

  it('returns empty array when no commits are newer than the given version', async () => {
    const result = await check({
      source,
      version: { pr: '1', commit: 'ccc', committed: '2024-01-03T10:00:00Z' },
    });

    expect(result).toEqual([]);
  });

  it('sorts commits by committed date when returning new versions', async () => {
    const unordered: PullRequestCommit[] = [
      { pr: 1, commit: 'zzz', committed: '2024-01-05T00:00:00Z' },
      { pr: 2, commit: 'yyy', committed: '2024-01-04T00:00:00Z' },
    ];
    mockFetch.mockResolvedValue(unordered);

    const result = await check({
      source,
      version: { pr: '1', commit: 'aaa', committed: '2024-01-01T00:00:00Z' },
    });

    expect(result[0].commit).toBe('yyy');
    expect(result[1].commit).toBe('zzz');
  });

  it('passes correct owner and repo to github client', async () => {
    await check({ source: { repository: 'myorg/myrepo', access_token: 'mytoken' } });

    expect(mockFetch).toHaveBeenCalledWith('myorg', 'myrepo', 'mytoken');
  });
});
