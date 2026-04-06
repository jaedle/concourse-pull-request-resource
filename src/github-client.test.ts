import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import nock from 'nock';
import { fetchPullRequestCommits, parseRepository } from './github-client.js';

const GITHUB_API = 'https://api.github.com';

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
    nock.disableNetConnect();
  });

  afterEach(() => {
    nock.cleanAll();
    nock.enableNetConnect();
  });

  it('returns commits from a single page of open pull requests', async () => {
    nock(GITHUB_API)
      .post('/graphql')
      .reply(200, {
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
      });

    const result = await fetchPullRequestCommits('owner', 'repo', 'token');

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ pr: 1, commit: 'abc123', committed: '2024-01-01T10:00:00Z' });
    expect(result[1]).toEqual({ pr: 1, commit: 'def456', committed: '2024-01-02T10:00:00Z' });
    expect(result[2]).toEqual({ pr: 2, commit: 'ghi789', committed: '2024-01-03T10:00:00Z' });
  });

  it('paginates through multiple pages', async () => {
    nock(GITHUB_API)
      .post('/graphql')
      .reply(200, {
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
      })
      .post('/graphql', (body: { variables?: { cursor?: string } }) => {
        return body.variables?.cursor === 'cursor1';
      })
      .reply(200, {
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
      });

    const result = await fetchPullRequestCommits('owner', 'repo', 'token');

    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ pr: 1, commit: 'aaa', committed: '2024-01-01T00:00:00Z' });
    expect(result[1]).toEqual({ pr: 2, commit: 'bbb', committed: '2024-01-02T00:00:00Z' });
  });

  it('throws on a non-ok HTTP response', async () => {
    nock(GITHUB_API).post('/graphql').reply(401, 'Unauthorized');

    await expect(fetchPullRequestCommits('owner', 'repo', 'bad-token')).rejects.toThrow();
  });

  it('throws on GraphQL errors in the response body', async () => {
    nock(GITHUB_API)
      .post('/graphql')
      .reply(200, { errors: [{ message: 'Not found' }] });

    await expect(fetchPullRequestCommits('owner', 'repo', 'token')).rejects.toThrow('Not found');
  });

  it('returns empty array when there are no open pull requests', async () => {
    nock(GITHUB_API)
      .post('/graphql')
      .reply(200, {
        data: {
          repository: {
            pullRequests: {
              nodes: [],
              pageInfo: { endCursor: null, hasNextPage: false },
            },
          },
        },
      });

    const result = await fetchPullRequestCommits('owner', 'repo', 'token');
    expect(result).toEqual([]);
  });

  it('sends the access token as a Bearer authorization header', async () => {
    nock(GITHUB_API)
      .post('/graphql')
      .matchHeader('authorization', 'token my-secret-token')
      .reply(200, {
        data: {
          repository: {
            pullRequests: { nodes: [], pageInfo: { endCursor: null, hasNextPage: false } },
          },
        },
      });

    await fetchPullRequestCommits('owner', 'repo', 'my-secret-token');

    expect(nock.isDone()).toBe(true);
  });
});
