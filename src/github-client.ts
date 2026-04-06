import { PullRequestCommit } from './types.js';

const GITHUB_GRAPHQL_URL = 'https://api.github.com/graphql';

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

interface QueryResponse {
  data: {
    repository: {
      pullRequests: {
        nodes: PullRequestNode[];
        pageInfo: {
          endCursor: string | null;
          hasNextPage: boolean;
        };
      };
    };
  };
  errors?: Array<{ message: string }>;
}

export async function fetchPullRequestCommits(
  owner: string,
  repo: string,
  accessToken: string,
): Promise<PullRequestCommit[]> {
  const commits: PullRequestCommit[] = [];
  let cursor: string | null = null;

  do {
    const response = await fetch(GITHUB_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        Authorization: `bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: PULL_REQUESTS_QUERY,
        variables: { owner, repo, cursor },
      }),
    });

    if (!response.ok) {
      throw new Error(`GitHub API request failed: ${response.status} ${response.statusText}`);
    }

    const result = (await response.json()) as QueryResponse;

    if (result.errors && result.errors.length > 0) {
      throw new Error(`GitHub API error: ${result.errors.map((e) => e.message).join(', ')}`);
    }

    const pullRequests = result.data.repository.pullRequests;

    for (const pr of pullRequests.nodes) {
      for (const node of pr.commits.nodes) {
        commits.push({
          pr: pr.number,
          commit: node.commit.oid,
          committed: node.commit.committedDate,
        });
      }
    }

    if (pullRequests.pageInfo.hasNextPage) {
      cursor = pullRequests.pageInfo.endCursor;
    } else {
      cursor = null;
    }
  } while (cursor !== null);

  return commits;
}

export function parseRepository(repository: string): { owner: string; repo: string } {
  const parts = repository.split('/');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error(`Invalid repository format: "${repository}". Expected "owner/repo".`);
  }
  return { owner: parts[0], repo: parts[1] };
}
