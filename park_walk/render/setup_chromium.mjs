/**
 * Unpack a headless Chromium for offline Remotion renders.
 *
 * Remotion normally downloads Chrome Headless Shell from remotion.media. When that host is
 * unreachable (locked-down CI, air-gapped sandbox) we take the Chromium that the
 * `@sparticuz/chromium` npm package already ships *inside its tarball* — binary plus the
 * NSS/NSPR system libraries it needs — and unpack it into `.cache/chromium`.
 *
 *   node render/setup_chromium.mjs      # prints the executable path
 */
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = path.resolve(import.meta.dirname, '..');
const CACHE = path.join(ROOT, '.cache', 'chromium');
const EXE = path.join(CACHE, 'chromium');
const PKG = path.join(ROOT, 'node_modules', '@sparticuz', 'chromium', 'bin');

const inflate = (src, dst) => {
  fs.writeFileSync(dst, zlib.brotliDecompressSync(fs.readFileSync(src)));
};

if (!fs.existsSync(path.join(PKG, 'chromium.br'))) {
  console.error('Missing @sparticuz/chromium. Run: npm i -D @sparticuz/chromium');
  process.exit(1);
}

if (!fs.existsSync(EXE)) {
  fs.mkdirSync(path.join(CACHE, 'lib'), {recursive: true});
  console.error('· inflating chromium.br …');
  inflate(path.join(PKG, 'chromium.br'), EXE);
  fs.chmodSync(EXE, 0o755);

  console.error('· inflating NSS / NSPR runtime libraries …');
  inflate(path.join(PKG, 'al2023.tar.br'), path.join(CACHE, 'al2023.tar'));
  execFileSync('tar', ['-xf', path.join(CACHE, 'al2023.tar'), '-C', CACHE]);
  fs.rmSync(path.join(CACHE, 'al2023.tar'));

  console.error('· inflating SwiftShader (software GL) …');
  inflate(path.join(PKG, 'swiftshader.tar.br'), path.join(CACHE, 'swiftshader.tar'));
  execFileSync('tar', ['-xf', path.join(CACHE, 'swiftshader.tar'), '-C', CACHE]);
  fs.rmSync(path.join(CACHE, 'swiftshader.tar'));
}

console.log(EXE);
console.error(`  LD_LIBRARY_PATH=${path.join(CACHE, 'lib')}`);
