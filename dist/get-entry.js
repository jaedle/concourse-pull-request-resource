"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const get_js_1 = require("./get.js");
function readStdin() {
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
async function main() {
    const destination = process.argv[2];
    if (!destination) {
        throw new Error('Destination directory must be provided as first argument');
    }
    const input = JSON.parse(await readStdin());
    const output = await (0, get_js_1.get)(destination, input);
    process.stdout.write(JSON.stringify(output) + '\n');
}
main().catch((err) => {
    process.stderr.write(`error: ${err.message}\n`);
    process.exit(1);
});
//# sourceMappingURL=get-entry.js.map