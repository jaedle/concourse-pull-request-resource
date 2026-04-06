"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchPullRequestCommits = fetchPullRequestCommits;
exports.parseRepository = parseRepository;
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
async function fetchPullRequestCommits(owner, repo, accessToken) {
    const commits = [];
    let cursor = null;
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
        const result = (await response.json());
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
        }
        else {
            cursor = null;
        }
    } while (cursor !== null);
    return commits;
}
function parseRepository(repository) {
    const parts = repository.split('/');
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
        throw new Error(`Invalid repository format: "${repository}". Expected "owner/repo".`);
    }
    return { owner: parts[0], repo: parts[1] };
}
//# sourceMappingURL=github-client.js.map