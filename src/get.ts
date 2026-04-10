import * as path from "node:path";
import { type GitClient, SimpleGitClient } from "./git-client.js";
import { parseRepository } from "./github-client.js";
import type { GetInput, GetOutput } from "./types.js";

export async function get(
  destination: string,
  input: GetInput,
  git: GitClient = new SimpleGitClient(),
): Promise<GetOutput> {
  const { owner, repo } = parseRepository(input.source.repository);
  const { pr, commit } = input.version;
  const token = input.source.access_token;

  const repoUrl = `https://x-oauth-basic:${token}@github.com/${owner}/${repo}.git`;
  const destDir = path.resolve(destination);

  await git.clone(repoUrl, destDir, ["--depth", "1"]);
  await git.fetch("origin", `pull/${pr}/head`);
  await git.merge([
    "--no-ff",
    "--no-edit",
    "-m",
    `Merge pull request #${pr} commit ${commit}`,
    commit,
  ]);

  return {
    version: input.version,
    metadata: [
      { name: "pr", value: pr },
      { name: "commit", value: commit },
      { name: "committed", value: input.version.committed },
    ],
  };
}
