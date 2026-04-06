import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchPullRequestCommits, parseRepository } from './github-client.js';

vi.mock('@octokit/graphql', () => {
  const mockGraphql = vi.fn();
  mockGraphql.defaults = vi.fn(() => mockGraphql);
  return { graphql: mockGraphql };
});

import { graphql } from '@octokit/graphql';
const mockGraphql = vi.mocked(graphql) as ReturnType<typeof vi.fn> & {
  defaults: ReturnType<typeof vi.fn>;
};

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
    vi.clearAllMocks();
    mockGraphql.defaults.mockReturnValue(mockGraphql);
  });

  it('returns commits from a single page of open pull requests', async () => {
    mockGraphql.mockResolvedValue({
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
    });

    const result = await fetchPullRequestCommits('owner', 'repo', 'token');

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ pr: 1, commit: 'abc123', committed: '2024-01-01T10:00:00Z' });
    expect(result[1]).toEqual({ pr: 1, commit: 'def456', committed: '2024-01-02T10:00:00Z' });
    expect(result[2]).toEqual({ pr: 2, commit: 'ghi789', committed: '2024-01-03T10:00:00Z' });
  });

  it('paginates through multiple pages', async () => {
    mockGraphql
      .mockResolvedValueOnce({
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
      })
      .mockResolvedValueOnce({
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
      });

    const result = await fetchPullRequestCommits('owner', 'repo', 'token');

    expect(result).toHaveLength(2);
    expect(mockGraphql).toHaveBeenCalledTimes(2);
    expect(mockGraphql.mock.calls[1][1]).toMatchObject({ cursor: 'cursor1' });
  });

  it('throws when graphql call rejects', async () => {
    mockGraphql.mockRejectedValue(new Error('Bad credentials'));

    await expect(fetchPullRequestCommits('owner', 'repo', 'bad-token')).rejects.toThrow(
      'Bad credentials',
    );
  });

  it('returns empty array when there are no open pull requests', async () => {
    mockGraphql.mockResolvedValue({
      repository: {
        pullRequests: {
          nodes: [],
          pageInfo: { endCursor: null, hasNextPage: false },
        },
      },
    });

    const result = await fetchPullRequestCommits('owner', 'repo', 'token');
    expect(result).toEqual([]);
  });

  it('passes the access token to graphql.defaults', async () => {
    mockGraphql.mockResolvedValue({
      repository: {
        pullRequests: { nodes: [], pageInfo: { endCursor: null, hasNextPage: false } },
      },
    });

    await fetchPullRequestCommits('owner', 'repo', 'my-secret-token');

    expect(mockGraphql.defaults).toHaveBeenCalledWith({
      headers: { authorization: 'token my-secret-token' },
    });
  });
});
