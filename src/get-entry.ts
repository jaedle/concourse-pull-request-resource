import { get } from "./get.js";
import { SimpleGitClient } from "./git-client.js";
import type { GetInput } from "./types.js";

async function readStdin(): Promise<string> {
  const chunks: string[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk as string);
  }
  return chunks.join("");
}

async function main(): Promise<void> {
  const destination = process.argv[2];
  if (!destination) {
    throw new Error("Destination directory must be provided as first argument");
  }

  const input: GetInput = JSON.parse(await readStdin());
  const output = await get(destination, input, new SimpleGitClient());
  process.stdout.write(`${JSON.stringify(output)}\n`);
}

main().catch((err) => {
  process.stderr.write(`error: ${err.message}\n`);
  process.exit(1);
});
