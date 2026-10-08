// Copies the Stockfish WASM engine (lite, single-threaded) into public/engine so the
// browser can load it as a Web Worker. Single-threaded builds need no COOP/COEP headers.
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve('stockfish/package.json'));
const { buildVersion } = require('stockfish/package.json');
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'engine');

mkdirSync(outDir, { recursive: true });
for (const ext of ['js', 'wasm']) {
  const name = `stockfish-${buildVersion}-lite-single.${ext}`;
  copyFileSync(join(pkgDir, 'bin', name), join(outDir, `stockfish.${ext}`));
}
console.log(`Copied Stockfish ${buildVersion} (lite, single-threaded) to public/engine`);
