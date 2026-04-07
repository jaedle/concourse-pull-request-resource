import { describe, it, expect, beforeEach } from 'vitest';
import { get } from './get.js';
import { GitClient } from './git-client.js';
import { GetInput } from './types.js';

class FakeGitClient implements GitClient {
  clonedUrl: string | null = null;
  clonedDest: string | null = null;
  clonedOptions: string[] | null = null;
  fetchedRemote: string | null = null;
  fetchedRef: string | null = null;
  mergedArgs: string[] | null = null;

  async clone(url: string, dest: string, options: string[]): Promise<void> {
    this.clonedUrl = url;
    this.clonedDest = dest;
    this.clonedOptions = options;
  }

  async fetch(remote: string, ref: string): Promise<void> {
    this.fetchedRemote = remote;
    this.fetchedRef = ref;
  }

  async merge(args: string[]): Promise<void> {
    this.mergedArgs = args;
  }
}

const input: GetInput = {
  source: { repository: 'owner/repo', access_token: 'mytoken' },
  version: { pr: '42', commit: 'deadbeef', committed: '2024-06-01T12:00:00Z' },
};

describe('get', () => {
  let fakeGit: FakeGitClient;

  beforeEach(() => {
    fakeGit = new FakeGitClient();
  });

  it('clones the repository using the access token', async () => {
    await get('/tmp/dest', input, fakeGit);

    expect(fakeGit.clonedUrl).toBe('https://x-oauth-basic:mytoken@github.com/owner/repo.git');
    expect(fakeGit.clonedDest).toContain('dest');
    expect(fakeGit.clonedOptions).toEqual(['--depth', '1']);
  });

  it('fetches the PR head ref', async () => {
    await get('/tmp/dest', input, fakeGit);

    expect(fakeGit.fetchedRemote).toBe('origin');
    expect(fakeGit.fetchedRef).toBe('pull/42/head');
  });

  it('merges the specified commit', async () => {
    await get('/tmp/dest', input, fakeGit);

    expect(fakeGit.mergedArgs).toContain('deadbeef');
  });

  it('returns the version and metadata', async () => {
    const result = await get('/tmp/dest', input, fakeGit);

    expect(result.version).toEqual(input.version);
    expect(result.metadata).toContainEqual({ name: 'pr', value: '42' });
    expect(result.metadata).toContainEqual({ name: 'commit', value: 'deadbeef' });
    expect(result.metadata).toContainEqual({ name: 'committed', value: '2024-06-01T12:00:00Z' });
  });

  it('throws when repository format is invalid', async () => {
    const badInput: GetInput = {
      ...input,
      source: { ...input.source, repository: 'noslash' },
    };
    await expect(get('/tmp/dest', badInput, fakeGit)).rejects.toThrow('Invalid repository format');
  });
});
