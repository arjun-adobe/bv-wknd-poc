// Migrate authored adventure pages into Adventure structured content entries.
//
//   node tools/structured-content/migrate-adventures.mjs          dry run (all pages)
//   ... --apply                          create missing entries and publish them
//   ... --slugs bali-surf-camp,tahoe-skiing   limit to some pages
//   ... --apply --replace tahoe-skiing   also overwrite an existing entry
//
// Source: content/us/en/adventures/<slug>.plain.html (output of the adventure-detail import).
// Target: /adventures-data/<slug> in DA. Existing entries are never overwritten unless listed in
// --replace, because authors may have edited them in the form since the last migration.
import { readFileSync, readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { convertHtmlToJson, convertJsonToHtml, validationErrors } from './lib/sdk.mjs';
import { extractAdventure } from './lib/extract-adventure.mjs';
import { entryUnits, firstDifference, sourceUnits } from './lib/fidelity.mjs';
import {
  getDelivered, getSource, previewAndPublish, putSource, sameData,
} from './lib/da.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PAGES = join(HERE, '..', '..', 'content', 'us', 'en', 'adventures');
const FOLDER = '/adventures-data';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const listArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] || '').split(',').filter(Boolean) : [];
};
const ONLY = listArg('--slugs');
const REPLACE = new Set(listArg('--replace'));

const schema = JSON.parse(readFileSync(join(HERE, 'adventure.schema.json'), 'utf8'));
const slugs = readdirSync(PAGES).filter((f) => f.endsWith('.plain.html'))
  .map((f) => f.replace('.plain.html', ''))
  .filter((s) => !ONLY.length || ONLY.includes(s))
  .sort();

let failures = 0;
for (const slug of slugs) {
  const html = readFileSync(join(PAGES, `${slug}.plain.html`), 'utf8');
  const json = extractAdventure(html, slug);
  const path = `${FOLDER}/${slug}`;
  const problems = [];

  const errors = validationErrors(schema, json);
  if (errors.length) problems.push(`invalid: ${errors.join(', ')}`);
  const { html: entryHtml, error } = convertJsonToHtml({ json });
  if (error || !sameData(convertHtmlToJson({ html: entryHtml }).json?.data, json.data)) problems.push('html round-trip changed the data');
  const diff = firstDifference(sourceUnits(html), entryUnits(json.data));
  if (diff) problems.push(`content differs from page at ${diff}`);

  let status = problems.length ? `FAIL ${problems.join('; ')}` : 'ok';
  if (APPLY && !problems.length) {
    const existing = await getSource(`${path}.html`);
    const existingData = existing && convertHtmlToJson({ html: existing }).json?.data;
    if (existing && sameData(existingData, json.data)) {
      status = 'ok, entry already up to date';
    } else if (existing && !REPLACE.has(slug)) {
      status = 'SKIPPED: entry exists and differs (may have been edited in the form); use --replace to overwrite';
    } else {
      await putSource(`${path}.html`, entryHtml);
      const { preview, live } = await previewAndPublish(path);
      const delivered = await getDelivered(path, 'live');
      const match = sameData(delivered?.data, json.data);
      if (!match) problems.push('published data differs from what was saved');
      status = `${existing ? 'replaced' : 'created'}, preview ${preview}, publish ${live}, live data ${match ? 'identical' : 'DIFFERS'}`;
    }
  }
  if (problems.length) failures += 1;
  console.log(`${slug}: ${status}`);
}
console.log(`\n${slugs.length - failures}/${slugs.length} ok${APPLY ? '' : ' (dry run - nothing written)'}`);
process.exitCode = failures ? 1 : 0;
