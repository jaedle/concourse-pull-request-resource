import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from './get.js';
import { GetInput } from './types.js';

vi.mock('simple-git', () => {
  const repoGitMock = {
    fetch: vi.fn().mockResolvedValue(undefined),
    merge: vi.fn().mockResolvedValue(undefined),
  };
  const rootGitMock = {
    clone: vi.fn().mockResolvedValue(undefined),
  };
  return {
    simpleGit: vi.fn((dir?: string) => (dir ? repoGitMock : rootGitMock)),
    __repoGitMock: repoGitMock,
    __rootGitMock: rootGitMock,
  };
});

import * as simpleGitModule from 'simple-git';

const { __repoGitMock: repoGit, __rootGitMock: rootGit } = simpleGitModule as unknown as {
  __repoGitMock: { fetch: ReturnType<typeof vi.fn>; merge: ReturnType<typeof vi.fn> };
  __rootGitMock: { clone: ReturnType<typeof vi.fn> };
};

const input: GetInput = {
  source: { repository: 'owner/repo', access_token: 'mytoken' },
  version: { pr: '42', commit: 'deadbeef', committed: '2024-06-01T12:00:00Z' },
};

describe('get', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clones the repository using the access token', async () => {
    await get('/tmp/dest', input);

    expect(rootGit.clone).toHaveBeenCalledWith(
      'https://x-oauth-basic:mytoken@github.com/owner/repo.git',
      expect.stringContaining('dest'),
      ['--depth', '1'],
    );
  });

  it('fetches the PR head ref', async () => {
    await get('/tmp/dest', input);
    expect(repoGit.fetch).toHaveBeenCalledWith('origin', 'pull/42/head');
  });

  it('merges the specified commit', async () => {
    await get('/tmp/dest', input);
    expect(repoGit.merge).toHaveBeenCalledWith(
      expect.arrayContaining(['deadbeef']),
    );
  });

  it('returns the version and metadata', async () => {
    const result = await get('/tmp/dest', input);

    expect(result.version).toEqual(input.version);
    expect(result.metadata).toContainEqual({ name: 'pr', value: '42' });
    expect(result.metadata).toContainEqual({ name: 'commit', value: 'deadbeef' });
    expect(result.metadata).toContainEqual({
      name: 'committed',
      value: '2024-06-01T12:00:00Z',
    });
  });

  it('throws when repository format is invalid', async () => {
    const badInput: GetInput = {
      ...input,
      source: { ...input.source, repository: 'noslash' },
    };
    await expect(get('/tmp/dest', badInput)).rejects.toThrow('Invalid repository format');
  });
});
