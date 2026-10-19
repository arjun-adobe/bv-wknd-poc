// Check every entry in /adventures-data: the published (and preview) JSON must match
// what is saved in DA, and the entry must be valid against the schema in this folder.
// Catches data that changes in delivery (e.g. line breaks collapsed on publish).
//
//   node tools/structured-content/check-delivery.mjs
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { convertHtmlToJson, validationErrors } from './lib/sdk.mjs';
import {
  getDelivered, getSource, listFolder, sameData,
} from './lib/da.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const FOLDER = '/adventures-data';
const schema = JSON.parse(readFileSync(join(HERE, 'adventure.schema.json'), 'utf8'));

let failures = 0;
const names = await listFolder(FOLDER);
for (const slug of names) {
  const saved = convertHtmlToJson({ html: await getSource(`${FOLDER}/${slug}.html`) }).json;
  const errors = validationErrors(schema, saved);
  const result = [];
  for (const env of ['preview', 'live']) {
    const delivered = await getDelivered(`${FOLDER}/${slug}`, env);
    if (!delivered) result.push(`${env}: not available`);
    else result.push(`${env}: ${sameData(delivered.data, saved.data) ? 'matches' : 'DIFFERS from saved'}`);
  }
  const ok = !errors.length && result.every((r) => r.endsWith('matches'));
  if (!ok) failures += 1;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${slug}: ${errors.length ? `invalid (${errors.join(', ')}); ` : ''}${result.join(', ')}`);
}
console.log(`\n${names.length - failures}/${names.length} entries ok`);
process.exitCode = failures ? 1 : 0;
