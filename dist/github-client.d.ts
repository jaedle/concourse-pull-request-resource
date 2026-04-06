import { PullRequestCommit } from './types.js';
export declare function fetchPullRequestCommits(owner: string, repo: string, accessToken: string): Promise<PullRequestCommit[]>;
export declare function parseRepository(repository: string): {
    owner: string;
    repo: string;
};
//# sourceMappingURL=github-client.d.ts.map