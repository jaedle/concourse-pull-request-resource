import { simpleGit } from 'simple-git';
import * as path from 'path';

export interface GitClient {
  clone(url: string, dest: string, options: string[]): Promise<void>;
  fetch(remote: string, ref: string): Promise<void>;
  merge(args: string[]): Promise<void>;
}

export class SimpleGitClient implements GitClient {
  private destDir: string | null = null;

  async clone(url: string, dest: string, options: string[]): Promise<void> {
    this.destDir = path.resolve(dest);
    await simpleGit().clone(url, this.destDir, options);
  }

  async fetch(remote: string, ref: string): Promise<void> {
    await simpleGit(this.destDir!).fetch(remote, ref);
  }

  async merge(args: string[]): Promise<void> {
    await simpleGit(this.destDir!).merge(args);
  }
}
