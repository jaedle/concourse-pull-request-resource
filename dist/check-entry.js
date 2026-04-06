"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const check_js_1 = require("./check.js");
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
    const input = JSON.parse(await readStdin());
    const versions = await (0, check_js_1.check)(input);
    process.stdout.write(JSON.stringify(versions) + '\n');
}
main().catch((err) => {
    process.stderr.write(`error: ${err.message}\n`);
    process.exit(1);
});
//# sourceMappingURL=check-entry.js.map