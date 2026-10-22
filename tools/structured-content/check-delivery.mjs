// Check every Adventure entry in a folder: the published (and preview) JSON must match
// what is saved in DA, and the entry must be valid against the schema in this folder.
// Catches data that changes in delivery (e.g. line breaks collapsed on publish).
// Documents in the folder that aren't structured content entries are listed and skipped.
//
//   node tools/structured-content/check-delivery.mjs [--folder /us/en/events --schema event]
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { convertHtmlToJson, validationErrors } from './lib/sdk.mjs';
import {
  ENTRY_FOLDER, getDelivered, getSource, listFolder, sameData,
} from './lib/da.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const FOLDER = args.includes('--folder') ? args[args.indexOf('--folder') + 1] : ENTRY_FOLDER;
const SCHEMA = args.includes('--schema') ? args[args.indexOf('--schema') + 1] : 'adventure';
const schema = JSON.parse(readFileSync(join(HERE, `${SCHEMA}.schema.json`), 'utf8'));

let failures = 0;
let entries = 0;
const names = await listFolder(FOLDER);
for (const slug of names) {
  const html = await getSource(`${FOLDER}/${slug}.html`);
  if (!html.includes('class="da-form"')) {
    console.log(`skip ${slug}: not a structured content entry`);
    continue;
  }
  entries += 1;
  const saved = convertHtmlToJson({ html }).json;
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
console.log(`\n${entries - failures}/${entries} entries ok in ${FOLDER}`);
process.exitCode = failures ? 1 : 0;
