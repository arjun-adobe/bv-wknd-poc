// Loads Adobe's da-sc-sdk (the library the DA form editor uses to convert and
// validate structured content), pinned to a da-nx commit and checksum-verified.
// Downloaded once into .cache/ (git-ignored) instead of being committed.
import { createHash } from 'crypto';
import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
} from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const COMMIT = '27034f63e75bd06a2b1cfb83d487bec4bb49eafb';
const SHA256 = '88f0c92d112086065dd2db8d69a09191e096255936ee8f9e2f256628157fa068';
const SOURCE = `https://raw.githubusercontent.com/adobe/da-nx/${COMMIT}/nx/deps/da-sc-sdk/dist/index.js`;
const CACHE = join(dirname(fileURLToPath(import.meta.url)), '..', '.cache', `da-sc-sdk-${COMMIT.slice(0, 7)}.mjs`);

const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

if (!existsSync(CACHE) || sha256(readFileSync(CACHE)) !== SHA256) {
  const res = await fetch(SOURCE);
  if (!res.ok) throw new Error(`could not download da-sc-sdk: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (sha256(buf) !== SHA256) throw new Error('da-sc-sdk checksum mismatch - refusing to use it');
  mkdirSync(dirname(CACHE), { recursive: true });
  writeFileSync(CACHE, buf);
}

export const {
  convertHtmlToJson,
  convertJsonToHtml,
  createEngine,
  validateSchema,
} = await import(pathToFileURL(CACHE).href);

/**
 * Validation errors (JSON pointers) for a full { metadata, data } entry, the shape
 * the form editor loads. Validating only `data` silently checks nothing.
 */
export function validationErrors(schema, entry) {
  return Object.keys(createEngine({ schema, document: entry }).getState().validation?.errors ?? {});
}
