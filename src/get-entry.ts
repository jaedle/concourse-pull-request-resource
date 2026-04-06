import { get } from './get.js';
import { GetInput } from './types.js';

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.on('error', reject);
  });
}

async function main(): Promise<void> {
  const destination = process.argv[2];
  if (!destination) {
    throw new Error('Destination directory must be provided as first argument');
  }

  const input: GetInput = JSON.parse(await readStdin());
  const output = await get(destination, input);
  process.stdout.write(JSON.stringify(output) + '\n');
}

main().catch((err) => {
  process.stderr.write(`error: ${err.message}\n`);
  process.exit(1);
});
