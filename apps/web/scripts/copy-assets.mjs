// Copies browser runtime assets out of node_modules into public/ (gitignored):
// - Stockfish WASM engine (lite, single-threaded: needs no COOP/COEP headers)
// - MediaPipe vision WASM runtime, used to read a photo for the character editor
import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const publicDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');

const stockfishDir = dirname(require.resolve('stockfish/package.json'));
const { buildVersion } = require('stockfish/package.json');
const engineDir = join(publicDir, 'engine');
mkdirSync(engineDir, { recursive: true });
for (const ext of ['js', 'wasm']) {
  const name = `stockfish-${buildVersion}-lite-single.${ext}`;
  copyFileSync(join(stockfishDir, 'bin', name), join(engineDir, `stockfish.${ext}`));
}

// The package does not export package.json; its entry file sits in the package root.
const visionWasm = join(dirname(require.resolve('@mediapipe/tasks-vision')), 'wasm');
const visionOut = join(publicDir, 'mediapipe');
mkdirSync(visionOut, { recursive: true });
for (const file of readdirSync(visionWasm))
  copyFileSync(join(visionWasm, file), join(visionOut, file));

console.log(`Copied Stockfish ${buildVersion} and MediaPipe vision runtime to public/`);
