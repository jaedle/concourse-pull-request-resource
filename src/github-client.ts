import { graphql } from '@octokit/graphql';
import { PullRequestCommit } from './types.js';

const PULL_REQUESTS_QUERY = `
query GetPullRequests($owner: String!, $repo: String!, $cursor: String) {
  repository(owner: $owner, name: $repo) {
    pullRequests(states: [OPEN], first: 100, after: $cursor) {
      nodes {
        number
        commits(last: 100) {
          nodes {
            commit {
              oid
              committedDate
            }
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
}
`;

interface CommitNode {
  commit: {
    oid: string;
    committedDate: string;
  };
}

interface PullRequestNode {
  number: number;
  commits: {
    nodes: CommitNode[];
  };
}

interface PullRequestsResponse {
  repository: {
    pullRequests: {
      nodes: PullRequestNode[];
      pageInfo: {
        endCursor: string | null;
        hasNextPage: boolean;
      };
    };
  };
}

export interface PullRequestFetcher {
  fetchPullRequestCommits(owner: string, repo: string): Promise<PullRequestCommit[]>;
}

export class GitHubClient implements PullRequestFetcher {
  private readonly graphqlWithAuth: typeof graphql;

  constructor(accessToken: string) {
    this.graphqlWithAuth = graphql.defaults({
      headers: { authorization: `token ${accessToken}` },
    });
  }

  async fetchPullRequestCommits(owner: string, repo: string): Promise<PullRequestCommit[]> {
    const commits: PullRequestCommit[] = [];
    let cursor: string | null = null;

    do {
      const result: PullRequestsResponse = await this.graphqlWithAuth<PullRequestsResponse>(
        PULL_REQUESTS_QUERY,
        { owner, repo, cursor },
      );

      const pullRequests = result.repository.pullRequests;

      for (const pr of pullRequests.nodes) {
        for (const node of pr.commits.nodes) {
          commits.push({
            pr: pr.number,
            commit: node.commit.oid,
            committed: node.commit.committedDate,
          });
        }
      }

      cursor = pullRequests.pageInfo.hasNextPage ? pullRequests.pageInfo.endCursor : null;
    } while (cursor !== null);

    return commits;
  }
}

export function parseRepository(repository: string): { owner: string; repo: string } {
  const parts = repository.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid repository format: "${repository}". Expected "owner/repo".`);
  }
  return { owner: parts[0], repo: parts[1] };
}
