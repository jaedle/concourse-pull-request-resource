import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPullRequestCommits, parseRepository } from './github-client.js';

describe('parseRepository', () => {
  it('parses owner and repo from valid repository string', () => {
    const result = parseRepository('myorg/myrepo');
    expect(result).toEqual({ owner: 'myorg', repo: 'myrepo' });
  });

  it('throws on missing slash', () => {
    expect(() => parseRepository('noslash')).toThrow('Invalid repository format');
  });

  it('throws on empty owner', () => {
    expect(() => parseRepository('/repo')).toThrow('Invalid repository format');
  });

  it('throws on empty repo', () => {
    expect(() => parseRepository('owner/')).toThrow('Invalid repository format');
  });
});

describe('fetchPullRequestCommits', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns commits from a single page of open pull requests', async () => {
    const mockResponse = {
      data: {
        repository: {
          pullRequests: {
            nodes: [
              {
                number: 1,
                commits: {
                  nodes: [
                    { commit: { oid: 'abc123', committedDate: '2024-01-01T10:00:00Z' } },
                    { commit: { oid: 'def456', committedDate: '2024-01-02T10:00:00Z' } },
                  ],
                },
              },
              {
                number: 2,
                commits: {
                  nodes: [
                    { commit: { oid: 'ghi789', committedDate: '2024-01-03T10:00:00Z' } },
                  ],
                },
              },
            ],
            pageInfo: { endCursor: null, hasNextPage: false },
          },
        },
      },
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockResponse),
      }),
    );

    const result = await fetchPullRequestCommits('owner', 'repo', 'token');

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ pr: 1, commit: 'abc123', committed: '2024-01-01T10:00:00Z' });
    expect(result[1]).toEqual({ pr: 1, commit: 'def456', committed: '2024-01-02T10:00:00Z' });
    expect(result[2]).toEqual({ pr: 2, commit: 'ghi789', committed: '2024-01-03T10:00:00Z' });
  });

  it('paginates through multiple pages', async () => {
    const page1 = {
      data: {
        repository: {
          pullRequests: {
            nodes: [
              {
                number: 1,
                commits: {
                  nodes: [{ commit: { oid: 'aaa', committedDate: '2024-01-01T00:00:00Z' } }],
                },
              },
            ],
            pageInfo: { endCursor: 'cursor1', hasNextPage: true },
          },
        },
      },
    };
    const page2 = {
      data: {
        repository: {
          pullRequests: {
            nodes: [
              {
                number: 2,
                commits: {
                  nodes: [{ commit: { oid: 'bbb', committedDate: '2024-01-02T00:00:00Z' } }],
                },
              },
            ],
            pageInfo: { endCursor: null, hasNextPage: false },
          },
        },
      },
    };

    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page1) })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve(page2) });

    vi.stubGlobal('fetch', mockFetch);

    const result = await fetchPullRequestCommits('owner', 'repo', 'token');

    expect(result).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    const secondCallBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(secondCallBody.variables.cursor).toBe('cursor1');
  });

  it('throws on non-ok HTTP response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: false, status: 401, statusText: 'Unauthorized' }),
    );

    await expect(fetchPullRequestCommits('owner', 'repo', 'bad-token')).rejects.toThrow(
      'GitHub API request failed: 401 Unauthorized',
    );
  });

  it('throws on GraphQL errors', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ errors: [{ message: 'Not found' }] }),
      }),
    );

    await expect(fetchPullRequestCommits('owner', 'repo', 'token')).rejects.toThrow(
      'GitHub API error: Not found',
    );
  });

  it('returns empty array when there are no open pull requests', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              repository: {
                pullRequests: {
                  nodes: [],
                  pageInfo: { endCursor: null, hasNextPage: false },
                },
              },
            },
          }),
      }),
    );

    const result = await fetchPullRequestCommits('owner', 'repo', 'token');
    expect(result).toEqual([]);
  });
});
