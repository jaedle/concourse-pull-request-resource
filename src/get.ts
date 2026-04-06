import { simpleGit } from 'simple-git';
import * as path from 'path';
import { GetInput, GetOutput } from './types.js';
import { parseRepository } from './github-client.js';

export async function get(destination: string, input: GetInput): Promise<GetOutput> {
  const { owner, repo } = parseRepository(input.source.repository);
  const { pr, commit } = input.version;
  const token = input.source.access_token;

  const repoUrl = `https://x-oauth-basic:${token}@github.com/${owner}/${repo}.git`;
  const destDir = path.resolve(destination);

  const git = simpleGit();

  await git.clone(repoUrl, destDir, ['--depth', '1']);

  const repoGit = simpleGit(destDir);

  await repoGit.fetch('origin', `pull/${pr}/head`);

  await repoGit.merge([
    '--no-ff',
    '--no-edit',
    '-m',
    `Merge pull request #${pr} commit ${commit}`,
    commit,
  ]);

  return {
    version: input.version,
    metadata: [
      { name: 'pr', value: pr },
      { name: 'commit', value: commit },
      { name: 'committed', value: input.version.committed },
    ],
  };
}

