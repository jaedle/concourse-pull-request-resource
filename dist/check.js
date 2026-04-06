"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.check = check;
const github_client_js_1 = require("./github-client.js");
async function check(input) {
    const { owner, repo } = (0, github_client_js_1.parseRepository)(input.source.repository);
    const commits = await (0, github_client_js_1.fetchPullRequestCommits)(owner, repo, input.source.access_token);
    const sorted = commits.slice().sort((a, b) => new Date(a.committed).getTime() - new Date(b.committed).getTime());
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
function toVersion(c) {
    return {
        pr: String(c.pr),
        commit: c.commit,
        committed: c.committed,
    };
}
//# sourceMappingURL=check.js.map