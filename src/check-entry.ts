import { check } from "./check.js";
import { GitHubClient } from "./github-client.js";
import type { CheckInput } from "./types.js";

async function readStdin(): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as string);
  }
  return chunks.join("");
}

async function main(): Promise<void> {
  const input: CheckInput = JSON.parse(await readStdin());
  const client = new GitHubClient(input.source.access_token);
  const versions = await check(input, client);
  process.stdout.write(`${JSON.stringify(versions)}\n`);
}

main().catch((err) => {
  process.stderr.write(`error: ${err.message}\n`);
  process.exit(1);
});
